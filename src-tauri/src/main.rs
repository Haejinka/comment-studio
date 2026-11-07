#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
use serde::Serialize;
use std::path::Path;
use tauri::Manager;
use tauri_plugin_clipboard_manager::ClipboardExt;
use tauri_plugin_dialog::DialogExt;

#[derive(Serialize)]
struct SaveResult {
    cancelled: bool,
    path: Option<String>,
}

fn validate_file(name: &str, bytes: &[u8]) -> Result<&'static str, String> {
    if name.is_empty() || name.bytes().any(|b| b == 47 || b == 92) {
        return Err("Invalid filename.".into());
    }
    if bytes.is_empty() || bytes.len() > 256 * 1024 * 1024 {
        return Err("File is empty or exceeds 256 MB.".into());
    }
    match Path::new(name).extension().and_then(|x| x.to_str()) {
        Some("png") => {
            if !bytes.starts_with(b"\x89PNG\r\n\x1a\n") {
                return Err("Invalid PNG data.".into());
            }
            tauri::image::Image::from_bytes(bytes)
                .map_err(|_| "PNG could not be decoded.".to_string())?;
            Ok("png")
        }
        Some("zip") => {
            if !bytes.starts_with(b"PK\x03\x04") {
                return Err("Invalid ZIP data.".into());
            }
            Ok("zip")
        }
        Some("json") => {
            serde_json::from_slice::<serde_json::Value>(bytes)
                .map_err(|_| "Invalid draft backup.".to_string())?;
            Ok("json")
        }
        Some("csv") => {
            std::str::from_utf8(bytes).map_err(|_| "Invalid CSV text.".to_string())?;
            Ok("csv")
        }
        _ => Err("Unsupported file type.".into()),
    }
}
fn available_export_name(name: &str, exists: impl Fn(&str) -> bool) -> String {
    if !exists(name) {
        return name.to_string();
    }
    let path = Path::new(name);
    let stem = path
        .file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or("export");
    let extension = path.extension().and_then(|s| s.to_str()).unwrap_or("");
    for number in 2u64.. {
        let candidate = format!("{stem} ({number}).{extension}");
        if !exists(&candidate) {
            return candidate;
        }
    }
    unreachable!()
}
#[tauri::command]
async fn save_file(
    app: tauri::AppHandle,
    name: String,
    bytes: Vec<u8>,
) -> Result<SaveResult, String> {
    let extension = validate_file(&name, &bytes)?;
    let mut directory = app.path().download_dir().map_err(|e| e.to_string())?;
    if std::env::args().any(|x| x == "--test-mode") {
        if let Ok(dir) = std::env::var("COMMENT_STUDIO_TEST_SAVE_DIR") {
            directory = dir.into();
        }
    }
    let suggested = available_export_name(&name, |candidate| directory.join(candidate).exists());
    tauri::async_runtime::spawn_blocking(move || {
        let selected = app
            .dialog()
            .file()
            .set_title("Save file")
            .set_directory(&directory)
            .set_file_name(&suggested)
            .add_filter(extension.to_uppercase(), &[extension])
            .blocking_save_file();
        match selected {
            None => Ok(SaveResult {
                cancelled: true,
                path: None,
            }),
            Some(file) => {
                let path = file.into_path().map_err(|e| e.to_string())?;
                std::fs::write(&path, &bytes).map_err(|e| format!("Could not save file: {e}"))?;
                Ok(SaveResult {
                    cancelled: false,
                    path: Some(path.to_string_lossy().into_owned()),
                })
            }
        }
    })
    .await
    .map_err(|e| e.to_string())?
}
#[tauri::command]
fn copy_image(app: tauri::AppHandle, bytes: Vec<u8>) -> Result<(), String> {
    validate_file("clipboard.png", &bytes)?;
    let image = tauri::image::Image::from_bytes(&bytes).map_err(|e| e.to_string())?;
    app.clipboard()
        .write_image(&image)
        .map_err(|e| format!("Could not copy image: {e}"))
}
#[tauri::command]
fn copy_text(app: tauri::AppHandle, text: String) -> Result<(), String> {
    if text.len() > 1_000_000 {
        return Err("Text is too large.".into());
    }
    app.clipboard()
        .write_text(text)
        .map_err(|e| format!("Could not copy text: {e}"))
}
#[tauri::command]
fn set_app_theme(window: tauri::WebviewWindow, theme: String) -> Result<(), String> {
    let theme = match theme.as_str() {
        "light" => tauri::Theme::Light,
        "dark" => tauri::Theme::Dark,
        _ => return Err("Invalid theme.".into()),
    };
    window.set_theme(Some(theme)).map_err(|e| e.to_string())
}
fn main() {
    let mut context = tauri::generate_context!();
    // Tests use a separate WebView2 storage directory and never touch the user's drafts.
    if std::env::args().any(|x| x == "--test-mode") {
        if let Ok(dir) = std::env::var("COMMENT_STUDIO_TEST_USER_DATA") {
            if let Some(window) = context.config_mut().app.windows.first_mut() {
                window.data_directory = Some(dir.into());
            }
        }
    }
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .invoke_handler(tauri::generate_handler![
            save_file,
            copy_image,
            copy_text,
            set_app_theme
        ])
        .run(context)
        .expect("Could not start Comment Studio");
}
#[cfg(test)]
mod tests {
    use super::{available_export_name, validate_file};
    #[test]
    fn keeps_unused_filename() {
        assert_eq!(
            available_export_name("comment.png", |_| false),
            "comment.png"
        );
    }
    #[test]
    fn numbers_existing_exports() {
        assert_eq!(
            available_export_name("comment.png", |name| ["comment.png", "comment (2).png"]
                .contains(&name)),
            "comment (3).png"
        );
    }
    #[test]
    fn preserves_unicode_filename() {
        assert_eq!(
            available_export_name("Leo Jakšić.png", |name| name == "Leo Jakšić.png"),
            "Leo Jakšić (2).png"
        );
    }
    #[test]
    fn refuses_empty_or_unsupported_files() {
        assert!(validate_file("empty.png", &[]).is_err());
        assert!(validate_file("payload.exe", b"MZ").is_err());
    }
    #[test]
    fn refuses_invalid_images_and_archives() {
        assert!(validate_file("fake.png", b"not a png").is_err());
        assert!(validate_file("fake.zip", b"not a zip").is_err());
    }
    #[test]
    fn validates_backups_and_prevents_paths() {
        assert_eq!(
            validate_file("drafts.json", b"{\"version\":1}").unwrap(),
            "json"
        );
        assert!(validate_file("drafts.json", b"{broken").is_err());
        assert!(validate_file("../drafts.json", b"{}").is_err());
    }
}
