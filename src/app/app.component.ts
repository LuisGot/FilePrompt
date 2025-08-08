import { Component } from "@angular/core";
import { signal } from "@angular/core";
import { HeaderComponent } from "./components/header/header.component";
import {
	FileTreeComponent,
	FileNode,
} from "./components/file-tree/file-tree.component";
import { PromptComposerComponent } from "./components/prompt-composer/prompt-composer.component";
import { ToastComponent } from "./components/toast/toast.component";
import { ToastService } from "./services/toast.service";
import { TauriService } from "./services/tauri.service";
import { LoadingSpinnerComponent } from "./components/loading-spinner/loading-spinner.component";
import { CommonModule } from "@angular/common";
import { SettingsModalComponent } from "./components/settings-modal/settings-modal.component";

@Component({
	selector: "app-root",
	standalone: true,
	imports: [
		HeaderComponent,
		FileTreeComponent,
		PromptComposerComponent,
		ToastComponent,
		LoadingSpinnerComponent,
		CommonModule,
		SettingsModalComponent,
	],
	templateUrl: "./app.component.html",
})
export class AppComponent {
	fileTemplate = signal<string>(
		localStorage.getItem("fileTemplate") ||
			"File: {{file_name}}\nPath: {{file_path}}\nContent:\n{{file_content}}\n\n"
	);
	promptTemplate = signal<string>(
		localStorage.getItem("promptTemplate") || "{{files}}"
	);
	showComposer = signal<boolean>(true);
	showSettings = signal<boolean>(false);
	fileTree = signal<FileNode[]>([]);
	currentFolderPath: string | null = null;
	isCopying = signal<boolean>(false);
	isDownloading = signal<boolean>(false);
	isLoadingFolder = signal<boolean>(false);

	constructor(
		private tauri: TauriService,
		private toast: ToastService
	) {}

	onOpenSettings(): void {
		this.showSettings.set(true);
	}

	onSelectFolder(): void {
		this.isLoadingFolder.set(true);
		this.tauri
			.selectFolder()
			.then((folder: string | null) => {
				if (folder) {
					this.currentFolderPath = folder;
					this.loadDirectoryStructure(folder);
				} else {
					this.toast.addToast("Folder selection was cancelled.");
					this.isLoadingFolder.set(false);
				}
			})
			.catch(() => {
				this.toast.addToast(
					"An error occurred while selecting the folder. Please try again."
				);
				this.isLoadingFolder.set(false);
			});
	}

	onReloadFolder(): void {
		if (this.currentFolderPath) {
			this.isLoadingFolder.set(true);
			this.loadDirectoryStructure(this.currentFolderPath);
		} else {
			this.toast.addToast("No folder is selected for reloading.");
		}
	}

	private loadDirectoryStructure(folder: string): void {
		this.tauri
			.getDirectoryChildren(folder)
			.then((nodes: FileNode[]) => {
				this.fileTree.set(nodes);
			})
			.catch(() => {
				this.toast.addToast(
					"An error occurred while loading the directory. Please try again."
				);
			})
			.finally(() => {
				this.isLoadingFolder.set(false);
			});
	}

	onToggleComposer(): void {
		this.showComposer.update((show) => !show);
	}

	onCopyPrompt(): void {
		if (!this.currentFolderPath) {
			this.toast.addToast("No folder is selected.");
			return;
		}

		const selectedFiles: { name: string; path: string }[] = [];
		const collectFiles = (nodes: FileNode[]): void => {
			for (const node of nodes) {
				if (node.type === "file" && node.selected) {
					selectedFiles.push({ name: node.name, path: node.path });
				}
				if (node.children) {
					collectFiles(node.children);
				}
			}
		};
		collectFiles(this.fileTree());

		if (selectedFiles.length === 0) {
			this.toast.addToast("Please select at least one file.");
			return;
		}
		this.isCopying.set(true);
		this.tauri
			.generateAndCopyPrompt(
				this.currentFolderPath,
				selectedFiles,
				this.fileTemplate(),
				this.promptTemplate()
			)
			.then((result: boolean) => {
				if (result) {
					this.toast.addToast("Prompt copied to clipboard!");
				}
			})
			.catch(() => {
				this.toast.addToast(
					"An error occurred while copying the prompt. Please try again."
				);
			})
			.finally(() => {
				this.isCopying.set(false);
			});
	}

	onDownloadPrompt(): void {
		if (!this.currentFolderPath) {
			this.toast.addToast("No folder is selected.");
			return;
		}

		const selectedFiles: { name: string; path: string }[] = [];
		const collectFiles = (nodes: FileNode[]): void => {
			for (const node of nodes) {
				if (node.type === "file" && node.selected) {
					selectedFiles.push({ name: node.name, path: node.path });
				}
				if (node.children) {
					collectFiles(node.children);
				}
			}
		};
		collectFiles(this.fileTree());

		if (selectedFiles.length === 0) {
			this.toast.addToast("Please select at least one file.");
			return;
		}
		this.isDownloading.set(true);
		this.tauri
			.generatePromptContent(
				this.currentFolderPath,
				selectedFiles,
				this.fileTemplate(),
				this.promptTemplate()
			)
			.then((content: string) => {
				const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
				const url = URL.createObjectURL(blob);
				const link = document.createElement('a');
				link.href = url;
				
				const now = new Date();
				const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
				link.download = `prompt_${timestamp}.txt`;
				
				document.body.appendChild(link);
				link.click();
				document.body.removeChild(link);
				URL.revokeObjectURL(url);
				
				this.toast.addToast("Prompt downloaded successfully!");
			})
			.catch(() => {
				this.toast.addToast(
					"An error occurred while downloading the prompt. Please try again."
				);
			})
			.finally(() => {
				this.isDownloading.set(false);
			});
	}

	onIndividualCopy(file: FileNode): void {
		if (!this.currentFolderPath) {
			this.toast.addToast("No folder is selected.");
			return;
		}
		this.tauri
			.copyFile(
				{ name: file.name, path: file.path },
				this.currentFolderPath,
				this.fileTemplate()
			)
			.then((result: boolean) => {
				if (result) {
					this.toast.addToast(`Copied ${file.name} to clipboard!`);
				}
			})
			.catch(() => {
				this.toast.addToast(
					"An error occurred while copying the file. Please try again."
				);
			});
	}
}
