import { Injectable } from "@angular/core";
import { invoke } from "@tauri-apps/api/tauri";

/**
 * The TauriService wraps Tauri API calls.
 */
@Injectable({
  providedIn: "root",
})
export class TauriService {
  /**
   * Opens a folder selection dialog.
   */
  selectFolder(): Promise<string | null> {
    return invoke("select_folder");
  }

  /**
   * Retrieves the directory structure starting from a given folder.
   */
  getDirectoryStructure(folderPath: string): Promise<any> {
    return invoke("get_directory_structure", { folderPath });
  }

  /**
   * Reads the content of a file.
   */
  readFile(filePath: string): Promise<string> {
    return invoke("read_file", { filePath });
  }

  /**
   * Copies text to the clipboard.
   */
  copyToClipboard(text: string): Promise<void> {
    return invoke("copy_to_clipboard", { text });
  }
}
