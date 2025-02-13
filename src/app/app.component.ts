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
	],
	templateUrl: "./app.component.html",
})
export class AppComponent implements OnInit {
	fileFormat = signal<string>(
		localStorage.getItem("fileFormat") ||
			"File: {{file_name}}\nPath: {{file_path}}\nContent:\n{{file_content}}\n\n"
	);
	promptFormat = signal<string>(
		localStorage.getItem("promptFormat") || "{{files}}"
	);
	showComposer = signal<boolean>(true);
	fileTree = signal<FileNode[]>([]);
	currentFolderPath: string | null = null;
	isCopying = signal<boolean>(false);
	isLoadingFolder = signal<boolean>(false);

	constructor(
		@Inject(TauriService) private tauri: TauriService,
		@Inject(ToastService) private toast: ToastService
	) {}

	ngOnInit(): void {}

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
					this.toast.addToast("Folder selection cancelled");
					this.isLoadingFolder.set(false);
				}
			})
			.catch((error) => {
				this.toast.addToast("Error selecting folder: " + error);
				this.isLoadingFolder.set(false);
			});
	}

	// Reload folder contents
	onReloadFolder(): void {
		if (this.currentFolderPath) {
			this.isLoadingFolder.set(true);
			this.loadDirectoryStructure(this.currentFolderPath);
		} else {
			this.toast.addToast("No folder selected to reload");
		}
	}

	// Load immediate children of the selected folder
	private loadDirectoryStructure(folder: string): void {
		this.tauri
			.getDirectoryChildren(folder)
			.then((nodes: FileNode[]) => {
				this.fileTree.set(nodes);
			})
			.catch((error) => {
				this.toast.addToast("Error loading directory: " + error);
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
			this.toast.addToast("No folder selected");
			return;
		}
		const selectedFiles = this.getSelectedFiles();
		if (selectedFiles.length === 0) {
			this.toast.addToast("No files selected");
			return;
		}
		this.isCopying.set(true);
		this.tauri
			.generateAndCopyPrompt(
				this.currentFolderPath,
				selectedFiles,
				this.fileFormat(),
				this.promptFormat()
			)
			.then((result: boolean) => {
				if (result) {
					this.toast.addToast("Copied prompt to clipboard!");
				}
			})
			.catch((error) => {
				this.toast.addToast("Error copying to clipboard: " + error);
			})
			.finally(() => {
				this.isCopying.set(false);
			});
	}

	// Copy an individual file's content to clipboard
	onIndividualCopy(file: FileNode): void {
		if (!this.currentFolderPath) {
			this.toast.addToast("No folder selected");
			return;
		}
		this.tauri
			.copyFile(
				{ name: file.name, path: file.path },
				this.currentFolderPath,
				this.fileFormat()
			)
			.then((result: boolean) => {
				if (result) {
					this.toast.addToast(`Copied ${file.name}`);
				}
			})
			.catch((error) => {
				this.toast.addToast("Error copying file: " + error);
			});
	}

	// Update file format
	onFileFormatChange(newFormat: string): void {
		this.fileFormat.set(newFormat);
	}

	// Update prompt format
	onPromptFormatChange(newFormat: string): void {
		this.promptFormat.set(newFormat);
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
