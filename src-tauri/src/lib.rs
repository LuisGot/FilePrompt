#![allow(clippy::needless_return)]

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
use arboard::Clipboard;
use futures::future;
use ignore::gitignore::{Gitignore, GitignoreBuilder};
use reqwest;
use serde::{Deserialize, Serialize};
use serde_json;
use std::collections::BTreeMap;
use std::fs;
use std::path::Path;
use tauri::WebviewWindow;
use tiktoken_rs::o200k_base;

use tauri_plugin_dialog::{DialogExt, FilePath};

#[derive(Serialize, Deserialize)]
struct FileNode {
    #[serde(rename = "type")]
    node_type: String,
    name: String,
    path: String,
    children: Option<Vec<FileNode>>,
}

fn fetch_directory_children(dir_path: &str) -> Vec<FileNode> {
    let mut results = Vec::new();
    let repo_root = std::env::current_dir().unwrap_or_else(|_| std::path::PathBuf::from(dir_path));
    let selected_dir = Path::new(dir_path);

    let mut ignore_matchers = Vec::new();
    let mut current = selected_dir;
    loop {
        let gitignore_file = current.join(".gitignore");
        if gitignore_file.exists() {
            let mut builder = GitignoreBuilder::new(current);
            let _ = builder.add(gitignore_file);
            ignore_matchers.push((
                current.to_path_buf(),
                builder.build().unwrap_or_else(|_| Gitignore::empty()),
            ));
        }
        if current == repo_root || current.parent().is_none() {
            break;
        }
        current = current.parent().unwrap();
    }

    if let Ok(entries) = fs::read_dir(dir_path) {
        for entry in entries.flatten() {
            let path = entry.path();
            if ignore_matchers.iter().any(|(base, matcher)| {
                path.strip_prefix(base)
                    .map(|rel| matcher.matched(rel, path.is_dir()).is_ignore())
                    .unwrap_or(false)
            }) {
                continue;
            }

            if let Ok(metadata) = entry.metadata() {
                results.push(FileNode {
                    node_type: if metadata.is_dir() { "folder" } else { "file" }.into(),
                    name: entry.file_name().into_string().unwrap_or_default(),
                    path: path.to_string_lossy().into(),
                    children: None,
                });
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
async fn select_folder(window: WebviewWindow) -> Result<Option<String>, String> {
    Ok(tauri::async_runtime::spawn_blocking(move || {
        let (tx, rx) = std::sync::mpsc::channel();
        window
            .dialog()
            .file()
            .set_parent(&window)
            .pick_folder(move |folder: Option<FilePath>| {
                tx.send(folder).expect("Failed to send folder from dialog");
            });
        rx.recv().map_err(|e| e.to_string()).unwrap_or(None)
    })
    .await
    .map_err(|e| e.to_string())?
    .map(|p| match p {
        FilePath::Path(path_buf) => path_buf.to_string_lossy().to_string(),
        FilePath::Url(uri_string) => uri_string.to_string(),
    }))
}

#[tauri::command]
async fn get_directory_children(folder_path: String) -> Result<Vec<FileNode>, String> {
    Ok(fetch_directory_children(&folder_path))
}

#[derive(Serialize)]
struct FileMetrics {
    size: u64,
    line_count: usize,
    token_count: usize,
    file_path: String,
    is_valid: bool,
}

#[tauri::command]
async fn get_file_metrics(file_paths: Vec<String>) -> Result<Vec<FileMetrics>, String> {
    let tasks = file_paths.into_iter().map(|path| {
        tauri::async_runtime::spawn_blocking(move || -> Result<FileMetrics, String> {
            let size = fs::metadata(&path).map_err(|e| e.to_string())?.len();
            match fs::read_to_string(&path) {
                Ok(content) => Ok(FileMetrics {
                    size,
                    line_count: content.lines().count(),
                    token_count: o200k_base()
                        .map_err(|e| e.to_string())?
                        .encode_with_special_tokens(&content)
                        .len(),
                    file_path: path.clone(),
                    is_valid: true,
                }),
                Err(_) => Ok(FileMetrics {
                    size,
                    line_count: 0,
                    token_count: 0,
                    file_path: path,
                    is_valid: false,
                }),
            }
        })
    });
    let mut metrics = Vec::new();
    for res in future::join_all(tasks).await {
        metrics.push(res.map_err(|e| e.to_string())??);
    }
    Ok(metrics)
}

fn apply_template(template: &str, replacements: &[(&str, &str)]) -> String {
    let mut result = template.to_string();
    for (placeholder, value) in replacements {
        result = result.replacen(placeholder, value, 1);
    }
    result
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
    file_template: String,
    prompt_template: String,
}

fn generate_prompt_string(args: &GeneratePromptArgs) -> Result<String, String> {
    let mut aggregated = String::new();
    let folder_path_obj = Path::new(&args.folder_path);
    for file in &args.files {
        if let Ok(content) = fs::read_to_string(&file.path) {
            let relative_path = Path::new(&file.path)
                .strip_prefix(folder_path_obj)
                .unwrap_or(Path::new(&file.path))
                .to_string_lossy();
            aggregated.push_str(&apply_template(
                &args.file_template,
                &[
                    ("{{file_name}}", &file.name),
                    ("{{file_path}}", &relative_path),
                    ("{{file_content}}", &content),
                ],
            ));
        }
    }

    Ok(args.prompt_template
        .replacen("{{filetree}}", &build_filetree(&args.folder_path, &args.files), 1)
        .replacen("{{files}}", &aggregated, 1))
}

#[tauri::command]
async fn generate_and_copy_prompt(args: GeneratePromptArgs) -> Result<bool, String> {
    let content = generate_prompt_string(&args)?;
    Clipboard::new()
        .map_err(|e| e.to_string())?
        .set_text(content)
        .map_err(|e| e.to_string())?;
    Ok(true)
}

#[tauri::command]
async fn generate_prompt_content(args: GeneratePromptArgs) -> Result<String, String> {
    generate_prompt_string(&args)
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct CopyFileArgs {
    file: FileNodeInput,
    folder_path: String,
    file_template: String,
}

#[tauri::command]
async fn copy_file(args: CopyFileArgs) -> Result<bool, String> {
    if let Ok(content) = fs::read_to_string(&args.file.path) {
        let relative = args
            .file
            .path
            .strip_prefix(&args.folder_path)
            .unwrap_or(&args.file.path);
        let output = apply_template(
            &args.file_template,
            &[
                ("{{file_name}}", &args.file.name),
                ("{{file_path}}", relative),
                ("{{file_content}}", &content),
            ],
        );
        Clipboard::new()
            .map_err(|e| e.to_string())?
            .set_text(output)
            .map_err(|e| e.to_string())?;
        Ok(true)
    } else {
        Ok(false)
    }
}

#[derive(Deserialize)]
struct EnhancePromptArgs {
    model: String,
    api_key: String,
    prompt_template: String,
}

#[derive(Deserialize)]
struct OpenRouterChoice {
    text: String,
}

#[derive(Deserialize)]
struct OpenRouterResponse {
    choices: Vec<OpenRouterChoice>,
}

#[tauri::command]
async fn enhance_prompt(args: EnhancePromptArgs) -> Result<String, String> {
    let mut response: OpenRouterResponse = reqwest::Client::new()
        .post("https://openrouter.ai/api/v1/completions")
        .header("Authorization", format!("Bearer {}", args.api_key))
        .header("Content-Type", "application/json")
        .json(&serde_json::json!({
            "model": args.model,
            "prompt": include_str!("enhance_prompt.txt").replace("%%prompt%%", &args.prompt_template),
            "include_reasoning": false
        }))
        .send()
        .await
        .map_err(|e| e.to_string())?
        .json()
        .await
        .map_err(|e| e.to_string())?;

    if response.choices.is_empty() {
        Err("Invalid response format: no choices found".into())
    } else {
        Ok(response.choices.remove(0).text)
    }
}

#[derive(Deserialize)]
struct ConvertPromptArgs {
    model: String,
    api_key: String,
    prompt_template: String,
    format: String,
}

#[tauri::command]
async fn convert_prompt(args: ConvertPromptArgs) -> Result<String, String> {
    let mut response: OpenRouterResponse = reqwest::Client::new()
        .post("https://openrouter.ai/api/v1/completions")
        .header("Authorization", format!("Bearer {}", args.api_key))
        .header("Content-Type", "application/json")
        .json(&serde_json::json!({
            "model": args.model,
            "prompt": include_str!("convert_prompt.txt")
                .replace("%%format%%", &args.format)
                .replace("%%prompt%%", &args.prompt_template),
            "include_reasoning": false
        }))
        .send()
        .await
        .map_err(|e| e.to_string())?
        .json()
        .await
        .map_err(|e| e.to_string())?;

    if response.choices.is_empty() {
        Err("Invalid response format: no choices found".into())
    } else {
        Ok(response.choices.remove(0).text)
    }
}

#[derive(Default)]
struct TreeNode {
    children: BTreeMap<String, TreeNode>,
    is_file: bool,
}

impl TreeNode {
    fn insert(&mut self, parts: &[String]) {
        if let Some((head, tail)) = parts.split_first() {
            let node = self.children.entry(head.clone()).or_insert_with(TreeNode::default);
            if tail.is_empty() {
                node.is_file = true;
            } else {
                node.insert(tail);
            }
        }
    }

    fn to_string_tree(&self, prefix: &str) -> String {
        let mut result = String::new();
        for (i, (key, node)) in self.children.iter().enumerate() {
            let connector = if i + 1 == self.children.len() { "└── " } else { "├── " };
            result.push_str(prefix);
            result.push_str(connector);
            result.push_str(key);
            result.push('\n');
            result.push_str(&node.to_string_tree(&format!(
                "{}{}",
                prefix,
                if connector.starts_with('└') { "    " } else { "│   " }
            )));
        }
        result
    }
}

fn build_filetree(folder_path: &str, files: &[FileNodeInput]) -> String {
    let mut root = TreeNode::default();
    let folder = Path::new(folder_path);
    for file in files {
        let parts: Vec<String> = Path::new(&file.path)
            .strip_prefix(folder)
            .unwrap_or_else(|_| Path::new(&file.path))
            .components()
            .map(|c| c.as_os_str().to_string_lossy().into_owned())
            .collect();
        root.insert(&parts);
    }
    root.to_string_tree("")
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            select_folder,
            get_directory_children,
            generate_and_copy_prompt,
            generate_prompt_content,
            copy_file,
            get_file_metrics,
            enhance_prompt,
            convert_prompt
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
