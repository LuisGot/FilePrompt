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
   * (Kept for backward compatibility if needed.)
   */
  readFile(filePath: string): Promise<string> {
    return invoke("read_file", { filePath });
  }

  /**
   * Copies text to the clipboard.
   * (Kept for backward compatibility if needed.)
   */
  copyToClipboard(text: string): Promise<void> {
    return invoke("copy_to_clipboard", { text });
  }

  /**
   * New method: Calls the backend to generate the prompt from the selected files
   * and copy it to the clipboard.
   *
   * @param folderPath - The current folder path.
   * @param files - An array of objects with file name and path.
   * @param fileFormat - The file formatting string.
   * @param promptFormat - The overall prompt formatting string.
   */
  generateAndCopyPrompt(
    folderPath: string,
    files: { name: string; path: string }[],
    fileFormat: string,
    promptFormat: string
  ): Promise<boolean> {
    // Wrap the arguments in an "args" key so that the backend receives a single object.
    return invoke("generate_and_copy_prompt", {
      args: { folderPath, files, fileFormat, promptFormat },
    });
  }

  /**
   * New method: Calls the backend to copy an individual file’s formatted content
   * to the clipboard.
   *
   * @param file - An object with file name and path.
   * @param folderPath - The current folder path.
   * @param fileFormat - The file formatting string.
   */
  copyFile(
    file: { name: string; path: string },
    folderPath: string,
    fileFormat: string
  ): Promise<boolean> {
    // Wrap the arguments in an "args" key so that the backend receives a single object.
    return invoke("copy_file", {
      args: { file, folderPath, fileFormat },
    });
  }
}
