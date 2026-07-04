//! Probe a video file with ffprobe and return normalized metadata.

use serde::Serialize;
use std::path::Path;

use crate::ffmpeg::{command, ffprobe_bin};

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct VideoInfo {
    pub duration_sec: f64,
    pub width: u32,
    pub height: u32,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub bitrate: Option<u64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub fps: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub codec: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub audio_codec: Option<String>,
    pub size_bytes: u64,
}

pub fn probe(path: &str) -> Result<VideoInfo, String> {
    if !Path::new(path).exists() {
        return Err(format!("File not found: {path}"));
    }

    let output = command(ffprobe_bin())
        .args([
            "-v",
            "quiet",
            "-print_format",
            "json",
            "-show_format",
            "-show_streams",
            path,
        ])
        .output()
        .map_err(|e| format!("ffprobe failed: {e}"))?;

    if !output.status.success() {
        return Err("ffprobe could not read this file".into());
    }

    let json: serde_json::Value = serde_json::from_slice(&output.stdout)
        .map_err(|e| format!("Failed to parse ffprobe output: {e}"))?;

    let size_bytes = std::fs::metadata(path).map(|m| m.len()).unwrap_or(0);

    let format = &json["format"];
    let duration_sec = format["duration"]
        .as_str()
        .and_then(|s| s.parse::<f64>().ok())
        .unwrap_or(0.0);
    let bitrate = format["bit_rate"]
        .as_str()
        .and_then(|s| s.parse::<u64>().ok());

    let mut width = 0;
    let mut height = 0;
    let mut fps = None;
    let mut codec = None;
    let mut audio_codec = None;

    if let Some(streams) = json["streams"].as_array() {
        for stream in streams {
            match stream["codec_type"].as_str() {
                Some("video") if width == 0 => {
                    width = stream["width"].as_u64().unwrap_or(0) as u32;
                    height = stream["height"].as_u64().unwrap_or(0) as u32;
                    codec = stream["codec_name"].as_str().map(String::from);
                    fps = parse_fps(stream["avg_frame_rate"].as_str());
                }
                Some("audio") if audio_codec.is_none() => {
                    audio_codec = stream["codec_name"].as_str().map(String::from);
                }
                _ => {}
            }
        }
    }

    Ok(VideoInfo {
        duration_sec,
        width,
        height,
        bitrate,
        fps,
        codec,
        audio_codec,
        size_bytes,
    })
}

/// ffprobe reports frame rate as a fraction like "30000/1001".
fn parse_fps(value: Option<&str>) -> Option<f64> {
    let s = value?;
    let (num, den) = s.split_once('/')?;
    let num: f64 = num.parse().ok()?;
    let den: f64 = den.parse().ok()?;
    if den == 0.0 {
        return None;
    }
    Some(num / den)
}
