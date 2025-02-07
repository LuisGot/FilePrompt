#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde::{Serialize, Deserialize};
use std::fs;
use std::path::PathBuf;
use tauri::api::dialog::FileDialogBuilder;
use arboard::Clipboard;

#[derive(Serialize, Deserialize)]
struct FileNode {
    #[serde(rename = "type")]
    node_type: String, // "file" or "folder"
    name: String,
    path: String,
    children: Option<Vec<FileNode>>,
}

/// Helper function: Returns only the immediate children (non‑recursive) of the given directory.
fn fetch_directory_children(dir_path: &str) -> Vec<FileNode> {
    let mut results = Vec::new();
    if let Ok(entries) = fs::read_dir(dir_path) {
        for entry in entries.filter_map(Result::ok) {
            let path = entry.path();
            let filename = entry.file_name().into_string().unwrap_or_default();
            if let Ok(metadata) = entry.metadata() {
                if metadata.is_dir() {
                    results.push(FileNode {
                        node_type: "folder".into(),
                        name: filename,
                        path: path.to_string_lossy().to_string(),
                        children: None,
                    });
                } else {
                    results.push(FileNode {
                        node_type: "file".into(),
                        name: filename,
                        path: path.to_string_lossy().to_string(),
                        children: None,
                    });
                }
            }
        }
    }
    results.sort_by(|a, b| {
        if a.node_type != b.node_type {
            if a.node_type == "folder" {
                std::cmp::Ordering::Less
            } else {
                std::cmp::Ordering::Greater
            }
        } else {
            a.name.to_lowercase().cmp(&b.name.to_lowercase())
        }
    });
    results
}

/// Returns a full recursive tree of the given directory.
fn get_directory_tree(dir_path: &str) -> Vec<FileNode> {
    let mut results = Vec::new();
    if let Ok(entries) = fs::read_dir(dir_path) {
        for entry in entries.filter_map(Result::ok) {
            let path = entry.path();
            let filename = entry.file_name().into_string().unwrap_or_default();
            if let Ok(metadata) = entry.metadata() {
                if metadata.is_dir() {
                    let children = get_directory_tree(path.to_str().unwrap_or(""));
                    results.push(FileNode {
                        node_type: "folder".into(),
                        name: filename,
                        path: path.to_string_lossy().to_string(),
                        children: Some(children),
                    });
                } else {
                    results.push(FileNode {
                        node_type: "file".into(),
                        name: filename,
                        path: path.to_string_lossy().to_string(),
                        children: None,
                    });
                }
            }
        }
    }
    results.sort_by(|a, b| {
        if a.node_type != b.node_type {
            if a.node_type == "folder" {
                std::cmp::Ordering::Less
            } else {
                std::cmp::Ordering::Greater
            }
        } else {
            a.name.to_lowercase().cmp(&b.name.to_lowercase())
        }
    });
    results
}

#[tauri::command]
async fn select_folder(window: tauri::Window) -> Result<Option<String>, String> {
    let folder = tauri::async_runtime::spawn_blocking(move || {
        let (tx, rx) = std::sync::mpsc::channel();
        FileDialogBuilder::new()
            .set_parent(&window)
            .pick_folder(move |folder: Option<PathBuf>| {
                tx.send(folder).expect("Failed to send folder from dialog");
            });
        rx.recv().map_err(|e| e.to_string()).unwrap_or(None)
    })
    .await
    .map_err(|e| e.to_string())?;
    Ok(folder.map(|p| p.to_string_lossy().to_string()))
}

#[tauri::command]
async fn get_directory_structure(folder_path: String) -> Result<Vec<FileNode>, String> {
    Ok(get_directory_tree(&folder_path))
}

/// Tauri command: returns only the immediate children of the folder.
#[tauri::command]
async fn get_directory_children(folder_path: String) -> Result<Vec<FileNode>, String> {
    Ok(fetch_directory_children(&folder_path))
}

#[tauri::command]
async fn read_file(file_path: String) -> Result<String, String> {
    fs::read_to_string(&file_path).map_err(|e| e.to_string())
}

#[tauri::command]
async fn copy_to_clipboard(text: String) -> Result<bool, String> {
    let mut clipboard = Clipboard::new().map_err(|e| e.to_string())?;
    clipboard.set_text(text).map_err(|e| e.to_string())?;
    Ok(true)
}

#[derive(Deserialize)]
struct FileNodeInput {
    name: String,
    path: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct GeneratePromptArgs {
    folder_path: String,
    files: Vec<FileNodeInput>,
    file_format: String,
    prompt_format: String,
}

#[tauri::command]
async fn generate_and_copy_prompt(args: GeneratePromptArgs) -> Result<bool, String> {
    let mut aggregated = String::new();
    for file in args.files {
        let content = fs::read_to_string(&file.path).map_err(|e| e.to_string())?;
        let relative = file
            .path
            .strip_prefix(&args.folder_path)
            .unwrap_or(&file.path)
            .to_string();
        let formatted = args
            .file_format
            .replace("{{file_name}}", &file.name)
            .replace("{{file_content}}", &content)
            .replace("{{file_path}}", &relative);
        aggregated.push_str(&formatted);
    }
    let final_output = args.prompt_format.replace("{{files}}", &aggregated);
    let mut clipboard = Clipboard::new().map_err(|e| e.to_string())?;
    clipboard.set_text(final_output).map_err(|e| e.to_string())?;
    Ok(true)
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct CopyFileArgs {
    file: FileNodeInput,
    folder_path: String,
    file_format: String,
}

#[tauri::command]
async fn copy_file(args: CopyFileArgs) -> Result<bool, String> {
    let content = fs::read_to_string(&args.file.path).map_err(|e| e.to_string())?;
    let relative = args
        .file.path
        .strip_prefix(&args.folder_path)
        .unwrap_or(&args.file.path)
        .to_string();
    let formatted = args
        .file_format
        .replace("{{file_name}}", &args.file.name)
        .replace("{{file_content}}", &content)
        .replace("{{file_path}}", &relative);
    let mut clipboard = Clipboard::new().map_err(|e| e.to_string())?;
    clipboard.set_text(formatted).map_err(|e| e.to_string())?;
    Ok(true)
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            select_folder,
            get_directory_structure,
            get_directory_children,
            read_file,
            copy_to_clipboard,
            generate_and_copy_prompt,
            copy_file
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
