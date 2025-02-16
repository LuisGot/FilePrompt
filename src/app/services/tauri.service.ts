import { Injectable } from "@angular/core";
import { invoke } from "@tauri-apps/api/tauri";

@Injectable({
	providedIn: "root",
})
export class TauriService {
	selectFolder(): Promise<string | null> {
		return invoke("select_folder");
	}

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
		fileTemplate: string,
		promptTemplate: string
	): Promise<boolean> {
		return invoke("generate_and_copy_prompt", {
			args: { folderPath, files, fileTemplate, promptTemplate },
		});
	}

	copyFile(
		file: { name: string; path: string },
		folderPath: string,
		fileTemplate: string
	): Promise<boolean> {
		return invoke("copy_file", {
			args: { file, folderPath, fileTemplate },
		});
	}

	getTokenCount(filePath: string): Promise<number> {
		return invoke("get_token_count", { filePath });
	}

	getTokenCountFromString(content: string): Promise<number> {
		return invoke("get_token_count_from_string", { content });
	}

	getFileMetrics(filePaths: string[]): Promise<any> {
		return invoke("get_file_metrics", { filePaths });
	}

	async enhancePrompt(
		model: string,
		apiKey: string,
		promptTemplate: string
	): Promise<string> {
		return await invoke("enhance_prompt", {
			args: {
				model,
				api_key: apiKey,
				prompt_template: promptTemplate,
			},
		});
	}

	async convertPrompt(
		model: string,
		apiKey: string,
		promptTemplate: string,
		format: string
	): Promise<string> {
		return await invoke("convert_prompt", {
			args: {
				model,
				api_key: apiKey,
				prompt_template: promptTemplate,
				format,
			},
		});
	}
}
