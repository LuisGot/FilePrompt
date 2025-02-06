// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

// Import required dependencies
use serde::Serialize;
use std::fs;
use std::path::PathBuf;
use tauri::api::dialog::FileDialogBuilder;
use arboard::Clipboard;

// Struct representing a file or folder node in the directory tree
#[derive(Serialize)]
struct FileNode {
    #[serde(rename = "type")]
    node_type: String,  // "file" or "folder"
    name: String,       // Name of the file/folder
    path: String,       // Full path to the file/folder
    children: Option<Vec<FileNode>>, // Sub-files/folders for folders, None for files
}

// Recursively builds a tree structure of files and folders starting from the given directory
fn get_directory_tree(dir_path: &str) -> Vec<FileNode> {
    let mut results = Vec::new();
    if let Ok(entries) = fs::read_dir(dir_path) {
        for entry in entries.filter_map(Result::ok) {
            let path = entry.path();
            let filename = entry.file_name().into_string().unwrap_or_default();
            if let Ok(metadata) = entry.metadata() {
                if metadata.is_dir() {
                    // Recursively get children for directories
                    let children = get_directory_tree(path.to_str().unwrap_or(""));
                    results.push(FileNode {
                        node_type: "folder".into(),
                        name: filename,
                        path: path.to_string_lossy().to_string(),
                        children: Some(children),
                    });
                } else {
                    // Add files as leaf nodes
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
    // Sort: folders first, then files, alphabetically
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

// Tauri command to open a folder selection dialog
#[tauri::command]
async fn select_folder(window: tauri::Window) -> Result<Option<String>, String> {
    // Run the blocking dialog code on a separate thread.
    let folder = tauri::async_runtime::spawn_blocking(move || {
        let (tx, rx) = std::sync::mpsc::channel();
        FileDialogBuilder::new()
            .set_parent(&window)
            .pick_folder(move |folder: Option<PathBuf>| {
                tx.send(folder).expect("Failed to send folder from dialog");
            });
        // Wait for the folder selection to complete
        rx.recv().map_err(|e| e.to_string()).unwrap_or(None)
    })
    .await
    .map_err(|e| e.to_string())?;
    Ok(folder.map(|p| p.to_string_lossy().to_string()))
}

// Tauri command to get the directory structure starting from a given path
#[tauri::command]
async fn get_directory_structure(folder_path: String) -> Result<Vec<FileNode>, String> {
    Ok(get_directory_tree(&folder_path))
}

// Tauri command to read the contents of a file
#[tauri::command]
async fn read_file(file_path: String) -> Result<String, String> {
    fs::read_to_string(&file_path).map_err(|e| e.to_string())
}

// Tauri command to copy text to the system clipboard
#[tauri::command]
async fn copy_to_clipboard(text: String) -> Result<bool, String> {
    let mut clipboard = Clipboard::new().map_err(|e| e.to_string())?;
    clipboard.set_text(text).map_err(|e| e.to_string())?;
    Ok(true)
}

// Initialize and run the Tauri application
fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            select_folder,
            get_directory_structure,
            read_file,
            copy_to_clipboard
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
