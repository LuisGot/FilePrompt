import { Injectable } from "@angular/core";
import { invoke } from "@tauri-apps/api/tauri";

/**
 * Wraps Tauri API calls.
 */
@Injectable({
  providedIn: "root",
})
export class TauriService {
  selectFolder(): Promise<string | null> {
    return invoke("select_folder");
  }

  // Old recursive structure (kept for backward compatibility)
  getDirectoryStructure(folderPath: string): Promise<any> {
    return invoke("get_directory_structure", { folderPath });
  }

  // New command: only get immediate children
  getDirectoryChildren(folderPath: string): Promise<any> {
    return invoke("get_directory_children", { folderPath });
  }

  readFile(filePath: string): Promise<string> {
    return invoke("read_file", { filePath });
  }

  copyToClipboard(text: string): Promise<void> {
    return invoke("copy_to_clipboard", { text });
  }

  generateAndCopyPrompt(
    folderPath: string,
    files: { name: string; path: string }[],
    fileFormat: string,
    promptFormat: string
  ): Promise<boolean> {
    return invoke("generate_and_copy_prompt", {
      args: { folderPath, files, fileFormat, promptFormat },
    });
  }

  copyFile(
    file: { name: string; path: string },
    folderPath: string,
    fileFormat: string
  ): Promise<boolean> {
    return invoke("copy_file", {
      args: { file, folderPath, fileFormat },
    });
  }
}
