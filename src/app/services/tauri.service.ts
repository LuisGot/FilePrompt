import { Injectable } from "@angular/core";
import { invoke } from "@tauri-apps/api/tauri";

/** Wraps Tauri API calls. */
@Injectable({
	providedIn: "root",
})
export class TauriService {
	selectFolder(): Promise<string | null> {
		return invoke("select_folder");
	}

	/** Get immediate children of a directory. */
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

	getTokenCount(filePath: string): Promise<number> {
		return invoke("get_token_count", { filePath });
	}

	getTokenCountFromString(content: string): Promise<number> {
		return invoke("get_token_count_from_string", { content });
	}

	/** New method: Get file metrics (size, line count, token count) for multiple files concurrently */
	getFileMetrics(filePaths: string[]): Promise<any> {
		return invoke("get_file_metrics", { filePaths });
	}
}
