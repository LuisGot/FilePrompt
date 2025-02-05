import { Injectable } from "@angular/core";
import { invoke } from "@tauri-apps/api/tauri";

@Injectable({
	providedIn: "root",
})
export class TauriService {
	// Note: The command name is now "select_folder"
	selectFolder(): Promise<string | null> {
		return invoke("select_folder");
	}

	getDirectoryStructure(folderPath: string): Promise<any> {
		return invoke("get_directory_structure", { folderPath });
	}

	readFile(filePath: string): Promise<string> {
		return invoke("read_file", { filePath });
	}

	copyToClipboard(text: string): Promise<void> {
		return invoke("copy_to_clipboard", { text });
	}
}
