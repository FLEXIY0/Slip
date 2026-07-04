//! Two-pass (and single-pass) size-targeted encoding via FFmpeg.

use serde::{Deserialize, Serialize};
use std::io::{BufRead, BufReader};
use std::process::{Command, Stdio};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use tauri::{AppHandle, Emitter};

use crate::ffmpeg::{command, ffmpeg_bin};
use crate::probe;

#[derive(Debug, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct EncodePlan {
    pub video_bitrate: u64,
    pub audio_bitrate: u64,
    pub target_width: u32,
    pub target_height: u32,
    #[serde(default)]
    pub two_pass: bool,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
struct ProgressPayload {
    job_id: String,
    stage: String,
    ratio: f64,
    #[serde(skip_serializing_if = "Option::is_none")]
    speed: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    fps: Option<f64>,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
struct LogPayload {
    job_id: String,
    ts: u64,
    level: String,
    text: String,
}

fn now_ms() -> u64 {
    use std::time::{SystemTime, UNIX_EPOCH};
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis() as u64)
        .unwrap_or(0)
}

fn emit_log(app: &AppHandle, job_id: &str, level: &str, text: impl Into<String>) {
    let _ = app.emit(
        "slip://log",
        LogPayload {
            job_id: job_id.to_string(),
            ts: now_ms(),
            level: level.to_string(),
            text: text.into(),
        },
    );
}

fn emit_progress(app: &AppHandle, job_id: &str, stage: &str, ratio: f64, speed: Option<f64>) {
    let _ = app.emit(
        "slip://progress",
        ProgressPayload {
            job_id: job_id.to_string(),
            stage: stage.to_string(),
            ratio: ratio.clamp(0.0, 1.0),
            speed,
            fps: None,
        },
    );
}

fn null_sink() -> &'static str {
    if cfg!(windows) {
        "NUL"
    } else {
        "/dev/null"
    }
}

/// Run the full compression job, returning the output file path.
pub fn run(
    app: &AppHandle,
    job_id: &str,
    input: &str,
    plan: &EncodePlan,
    _hardware_accel: bool,
    cancel: Arc<AtomicBool>,
) -> Result<String, String> {
    let info = probe::probe(input)?;
    let duration = info.duration_sec.max(0.1);

    let out_dir = std::env::temp_dir().join("slip");
    std::fs::create_dir_all(&out_dir).map_err(|e| e.to_string())?;
    let output = out_dir.join(format!("{job_id}.mp4"));
    let output_str = output.to_string_lossy().to_string();
    let passlog = out_dir.join(format!("{job_id}-pass"));

    let scale = format!(
        "scale={}:{}:flags=bicubic",
        plan.target_width, plan.target_height
    );
    let vbr = format!("{}k", plan.video_bitrate / 1000);
    let abr = format!("{}k", plan.audio_bitrate / 1000);
    let has_audio = info.audio_codec.is_some() && plan.audio_bitrate > 0;

    emit_progress(app, job_id, "preparing", 0.01, None);
    emit_log(app, job_id, "info", format!("Target video bitrate {vbr}"));

    if plan.two_pass {
        // ── Pass 1: analysis ───────────────────────────────────────────────
        let mut p1 = command(ffmpeg_bin());
        p1.args(["-y", "-i", input])
            .args(["-c:v", "libx264", "-b:v", &vbr])
            .args(["-preset", "medium", "-pass", "1"])
            .arg("-passlogfile")
            .arg(&passlog)
            .args(["-vf", &scale])
            .args(["-an", "-f", "null"])
            .arg(null_sink());
        run_pass(app, job_id, p1, duration, "pass1", 0.0, 0.5, &cancel)?;

        // ── Pass 2: encode ─────────────────────────────────────────────────
        let mut p2 = command(ffmpeg_bin());
        p2.args(["-y", "-i", input])
            .args(["-c:v", "libx264", "-b:v", &vbr])
            .args(["-preset", "medium", "-pass", "2"])
            .arg("-passlogfile")
            .arg(&passlog)
            .args(["-vf", &scale])
            .args(["-pix_fmt", "yuv420p", "-movflags", "+faststart"]);
        if has_audio {
            p2.args(["-c:a", "aac", "-b:a", &abr]);
        } else {
            p2.arg("-an");
        }
        p2.arg(&output_str);
        run_pass(app, job_id, p2, duration, "pass2", 0.5, 1.0, &cancel)?;
    } else {
        // ── Single pass ABR ────────────────────────────────────────────────
        let maxrate = format!("{}k", (plan.video_bitrate as f64 * 1.2 / 1000.0) as u64);
        let bufsize = format!("{}k", plan.video_bitrate * 2 / 1000);
        let mut p = command(ffmpeg_bin());
        p.args(["-y", "-i", input])
            .args(["-c:v", "libx264", "-preset", "medium", "-b:v", &vbr])
            .args(["-maxrate", &maxrate, "-bufsize", &bufsize])
            .args(["-vf", &scale])
            .args(["-pix_fmt", "yuv420p", "-movflags", "+faststart"]);
        if has_audio {
            p.args(["-c:a", "aac", "-b:a", &abr]);
        } else {
            p.arg("-an");
        }
        p.arg(&output_str);
        run_pass(app, job_id, p, duration, "encoding", 0.0, 1.0, &cancel)?;
    }

    // Clean up 2-pass logs.
    let _ = std::fs::remove_file(out_dir.join(format!("{job_id}-pass-0.log")));
    let _ = std::fs::remove_file(out_dir.join(format!("{job_id}-pass-0.log.mbtree")));

    emit_progress(app, job_id, "done", 1.0, None);
    let final_size = std::fs::metadata(&output).map(|m| m.len()).unwrap_or(0);
    emit_log(
        app,
        job_id,
        "info",
        format!("Done · {:.1} MB", final_size as f64 / 1_048_576.0),
    );

    Ok(output_str)
}

/// Spawn one ffmpeg invocation and stream its progress into events.
fn run_pass(
    app: &AppHandle,
    job_id: &str,
    mut cmd: Command,
    duration: f64,
    stage: &str,
    base: f64,
    span: f64,
    cancel: &Arc<AtomicBool>,
) -> Result<(), String> {
    cmd.args(["-progress", "pipe:1", "-nostats"])
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());

    emit_log(app, job_id, "cmd", format!("ffmpeg {}", args_preview(&cmd)));

    let mut child = cmd
        .spawn()
        .map_err(|e| format!("Failed to start ffmpeg: {e}"))?;

    // Drain stderr into log events on a side thread.
    if let Some(stderr) = child.stderr.take() {
        let app = app.clone();
        let job = job_id.to_string();
        std::thread::spawn(move || {
            for line in BufReader::new(stderr).lines().map_while(Result::ok) {
                let t = line.trim();
                if t.is_empty() {
                    continue;
                }
                let level = if t.contains("Error") || t.contains("error") {
                    "error"
                } else {
                    "info"
                };
                emit_log(&app, &job, level, t.to_string());
            }
        });
    }

    let stdout = child.stdout.take().ok_or_else(|| "no stdout".to_string())?;
    let mut speed: Option<f64> = None;

    for line in BufReader::new(stdout).lines().map_while(Result::ok) {
        if cancel.load(Ordering::Relaxed) {
            let _ = child.kill();
            let _ = child.wait();
            return Err("canceled".into());
        }
        if let Some((key, value)) = line.split_once('=') {
            match key {
                "out_time_ms" | "out_time_us" => {
                    if let Ok(us) = value.trim().parse::<f64>() {
                        let sec = us / 1_000_000.0;
                        let local = (sec / duration).clamp(0.0, 1.0);
                        emit_progress(app, job_id, stage, base + local * span, speed);
                    }
                }
                "speed" => {
                    speed = value.trim().trim_end_matches('x').parse::<f64>().ok();
                }
                _ => {}
            }
        }
    }

    let status = child.wait().map_err(|e| e.to_string())?;
    if cancel.load(Ordering::Relaxed) {
        return Err("canceled".into());
    }
    if !status.success() {
        return Err(format!("ffmpeg exited with {status}"));
    }
    emit_progress(app, job_id, stage, base + span, speed);
    Ok(())
}

fn args_preview(cmd: &Command) -> String {
    cmd.get_args()
        .map(|a| a.to_string_lossy().to_string())
        .collect::<Vec<_>>()
        .join(" ")
}
