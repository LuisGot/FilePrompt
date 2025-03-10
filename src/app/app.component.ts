import { Component, OnInit, Inject } from "@angular/core";
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
export class AppComponent implements OnInit {
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
	isLoadingFolder = signal<boolean>(false);

	constructor(
		@Inject(TauriService) private tauri: TauriService,
		@Inject(ToastService) private toast: ToastService
	) {}

	ngOnInit(): void {}

	// Open settings modal
	onOpenSettings(): void {
		this.showSettings.set(true);
	}

	// Close settings modal
	onCloseSettings(): void {
		this.showSettings.set(false);
	}

	// Initiate folder selection and load its contents
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

	// Reload folder contents
	onReloadFolder(): void {
		if (this.currentFolderPath) {
			this.isLoadingFolder.set(true);
			this.loadDirectoryStructure(this.currentFolderPath);
		} else {
			this.toast.addToast("No folder is selected for reloading.");
		}
	}

	// Load immediate children of the selected folder
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

	// Toggle prompt composer visibility
	onToggleComposer(): void {
		this.showComposer.update((show) => !show);
	}

	// Generate and copy prompt based on selected files
	onCopyPrompt(): void {
		if (!this.currentFolderPath) {
			this.toast.addToast("No folder is selected.");
			return;
		}
		const selectedFiles = this.getSelectedFiles();
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

	// Copy an individual file's content to clipboard
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

	// Update file template
	onFileTemplateChange(newTemplate: string): void {
		this.fileTemplate.set(newTemplate);
	}

	// Update prompt template
	onPromptTemplateChange(newTemplate: string): void {
		this.promptTemplate.set(newTemplate);
	}

	// Recursively collect selected file nodes
	getSelectedFiles(): { name: string; path: string }[] {
		const selectedFiles: { name: string; path: string }[] = [];
		const collectFiles = (nodes: FileNode[]): void => {
			nodes.forEach((node) => {
				if (node.type === "file" && node.selected) {
					selectedFiles.push({ name: node.name, path: node.path });
				}
				if (node.children) {
					collectFiles(node.children);
				}
			});
		};
		collectFiles(this.fileTree());
		return selectedFiles;
	}
}
