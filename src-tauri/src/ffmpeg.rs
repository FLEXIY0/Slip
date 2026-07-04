//! FFmpeg / ffprobe discovery and version reporting.

use std::path::{Path, PathBuf};
use std::process::Command;
use std::sync::{Mutex, OnceLock};

/// User-provided overrides (from Settings > FFmpeg path or the picker).
#[derive(Default)]
struct Overrides {
    ffmpeg: Option<PathBuf>,
    ffprobe: Option<PathBuf>,
}

fn overrides() -> &'static Mutex<Overrides> {
    static OVERRIDES: OnceLock<Mutex<Overrides>> = OnceLock::new();
    OVERRIDES.get_or_init(|| Mutex::new(Overrides::default()))
}

/// Record a user-selected ffmpeg path and derive ffprobe from the same folder.
/// An empty path clears the override (falls back to bundled / PATH).
pub fn set_custom_path(path: &str) {
    let mut o = overrides().lock().unwrap();
    if path.trim().is_empty() {
        o.ffmpeg = None;
        o.ffprobe = None;
        return;
    }
    let ffmpeg = PathBuf::from(path);
    let sibling = ffmpeg
        .parent()
        .map(|dir| dir.join(exe_name("ffprobe")))
        .filter(|p| p.exists());
    o.ffmpeg = Some(ffmpeg);
    o.ffprobe = sibling;
}

/// Resolve the ffmpeg binary. Order of preference:
///   1. User override (Settings > FFmpeg path)
///   2. `SLIP_FFMPEG` env var
///   3. A sidecar binary bundled next to the app executable
///   4. `ffmpeg` on the system PATH
pub fn ffmpeg_bin() -> PathBuf {
    if let Some(p) = overrides().lock().unwrap().ffmpeg.clone() {
        return p;
    }
    resolve("ffmpeg", "SLIP_FFMPEG")
}

/// Resolve ffprobe using the same strategy.
pub fn ffprobe_bin() -> PathBuf {
    if let Some(p) = overrides().lock().unwrap().ffprobe.clone() {
        return p;
    }
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
            if Path::new(&bundled).exists() {
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
