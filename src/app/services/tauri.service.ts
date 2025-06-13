import { Injectable } from "@angular/core";
import { invoke } from "@tauri-apps/api/core";

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

	getFileMetrics(filePaths: string[]): Promise<any> {
		return invoke("get_file_metrics", { filePaths });
	}

	enhancePrompt(
		model: string,
		apiKey: string,
		promptTemplate: string
	): Promise<string> {
		return invoke("enhance_prompt", {
			args: { model, api_key: apiKey, prompt_template: promptTemplate },
		});
	}

	convertPrompt(
		model: string,
		apiKey: string,
		promptTemplate: string,
		format: string
	): Promise<string> {
		return invoke("convert_prompt", {
			args: { model, api_key: apiKey, prompt_template: promptTemplate, format },
		});
	}
}
