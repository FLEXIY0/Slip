//! Slip — native compression backend.
//!
//! Exposes four commands to the frontend:
//!   ffmpeg_version, probe_video, compress_video, cancel_job

mod compress;
mod ffmpeg;
mod probe;

use std::collections::HashMap;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};

use compress::EncodePlan;
use probe::VideoInfo;
use tauri::{AppHandle, Manager, State};

/// Tracks in-flight jobs so they can be canceled by id.
#[derive(Default)]
struct JobRegistry(Mutex<HashMap<String, Arc<AtomicBool>>>);

#[tauri::command]
fn ffmpeg_version() -> Result<String, String> {
    ffmpeg::version()
}

#[tauri::command]
fn probe_video(path: String) -> Result<VideoInfo, String> {
    probe::probe(&path)
}

#[tauri::command]
async fn compress_video(
    app: AppHandle,
    state: State<'_, JobRegistry>,
    job_id: String,
    path: String,
    plan: EncodePlan,
    hardware_accel: bool,
) -> Result<String, String> {
    let cancel = Arc::new(AtomicBool::new(false));
    state
        .0
        .lock()
        .unwrap()
        .insert(job_id.clone(), cancel.clone());

    let jid = job_id.clone();
    let result = tauri::async_runtime::spawn_blocking(move || {
        compress::run(&app, &jid, &path, &plan, hardware_accel, cancel)
    })
    .await
    .map_err(|e| e.to_string())?;

    state.0.lock().unwrap().remove(&job_id);
    result
}

#[tauri::command]
fn cancel_job(state: State<'_, JobRegistry>, job_id: String) {
    if let Some(flag) = state.0.lock().unwrap().get(&job_id) {
        flag.store(true, Ordering::Relaxed);
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .manage(JobRegistry::default())
        .setup(|app| {
            // Surface the resolved ffmpeg on startup for easier debugging.
            if let Ok(v) = ffmpeg::version() {
                log::log_startup(app.handle(), &v);
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            ffmpeg_version,
            probe_video,
            compress_video,
            cancel_job
        ])
        .run(tauri::generate_context!())
        .expect("error while running Slip");
}

/// Small startup logging helper kept out of the hot path.
mod log {
    use tauri::AppHandle;
    pub fn log_startup(_app: &AppHandle, version: &str) {
        println!("[slip] {version}");
    }
}
