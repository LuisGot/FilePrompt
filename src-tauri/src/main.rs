#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use arboard::Clipboard;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use tauri::api::dialog::FileDialogBuilder;
use tiktoken_rs::tiktoken::p50k_base;

#[derive(Serialize, Deserialize)]
struct FileNode {
    #[serde(rename = "type")]
    node_type: String, // "file" or "folder"
    name: String,
    path: String,
    children: Option<Vec<FileNode>>,
}

/// Returns immediate children of the given directory.
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

#[tauri::command]
async fn get_token_count(file_path: String) -> Result<usize, String> {
    let content = fs::read_to_string(&file_path).map_err(|e| e.to_string())?;
    let bpe = p50k_base().map_err(|e| e.to_string())?;
    let tokens = bpe.encode_with_special_tokens(&content);
    Ok(tokens.len())
}

#[tauri::command]
async fn get_token_count_from_string(content: String) -> Result<usize, String> {
    let bpe = p50k_base().map_err(|e| e.to_string())?;
    let tokens = bpe.encode_with_special_tokens(&content);
    Ok(tokens.len())
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

        // Create a template context with our values
        let mut template = args.file_format.clone();
        let replacements = [
            ("{{file_name}}", file.name),
            ("{{file_path}}", relative),
            ("{{file_content}}", content),
        ];

        // Apply replacements in order
        for (placeholder, value) in replacements.iter() {
            template = template.replacen(placeholder, value, 1);
        }
        aggregated.push_str(&template);
    }

    // Apply the final template replacement
    let final_output = args.prompt_format.replacen("{{files}}", &aggregated, 1);
    let mut clipboard = Clipboard::new().map_err(|e| e.to_string())?;
    clipboard
        .set_text(final_output)
        .map_err(|e| e.to_string())?;
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
        .file
        .path
        .strip_prefix(&args.folder_path)
        .unwrap_or(&args.file.path)
        .to_string();

    // Create a template context with our values
    let mut template = args.file_format.clone();
    let replacements = [
        ("{{file_name}}", args.file.name),
        ("{{file_path}}", relative),
        ("{{file_content}}", content),
    ];

    // Apply replacements in order
    for (placeholder, value) in replacements.iter() {
        template = template.replacen(placeholder, value, 1);
    }

    let mut clipboard = Clipboard::new().map_err(|e| e.to_string())?;
    clipboard.set_text(template).map_err(|e| e.to_string())?;
    Ok(true)
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            select_folder,
            get_directory_children,
            read_file,
            copy_to_clipboard,
            generate_and_copy_prompt,
            copy_file,
            get_token_count,
            get_token_count_from_string
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
