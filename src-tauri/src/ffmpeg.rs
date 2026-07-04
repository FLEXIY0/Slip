//! FFmpeg / ffprobe discovery and version reporting.

use std::path::PathBuf;
use std::process::Command;

/// Resolve the ffmpeg binary. Order of preference:
///   1. `SLIP_FFMPEG` env var (set from the user's Settings > FFmpeg path)
///   2. A binary bundled next to the app executable
///   3. `ffmpeg` on the system PATH
pub fn ffmpeg_bin() -> PathBuf {
    resolve("ffmpeg", "SLIP_FFMPEG")
}

/// Resolve ffprobe using the same strategy.
pub fn ffprobe_bin() -> PathBuf {
    resolve("ffprobe", "SLIP_FFPROBE")
}

fn resolve(name: &str, env_key: &str) -> PathBuf {
    if let Ok(custom) = std::env::var(env_key) {
        if !custom.trim().is_empty() {
            return PathBuf::from(custom);
        }
    }
    if let Ok(exe) = std::env::current_exe() {
        if let Some(dir) = exe.parent() {
            let bundled = dir.join(exe_name(name));
            if bundled.exists() {
                return bundled;
            }
        }
    }
    PathBuf::from(name)
}

fn exe_name(name: &str) -> String {
    if cfg!(windows) {
        format!("{name}.exe")
    } else {
        name.to_string()
    }
}

/// Return the ffmpeg version banner's first line, or an error if unavailable.
pub fn version() -> Result<String, String> {
    let output = command(ffmpeg_bin())
        .arg("-version")
        .output()
        .map_err(|e| format!("FFmpeg not found: {e}. Set the path in Settings."))?;

    if !output.status.success() {
        return Err("FFmpeg returned an error".into());
    }
    let text = String::from_utf8_lossy(&output.stdout);
    let first = text.lines().next().unwrap_or("ffmpeg").to_string();
    Ok(first)
}

/// Build a Command with the console window suppressed on Windows.
pub fn command(bin: impl Into<PathBuf>) -> Command {
    #[allow(unused_mut)]
    let mut cmd = Command::new(bin.into());
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x0800_0000;
        cmd.creation_flags(CREATE_NO_WINDOW);
    }
    cmd
}
