import { Component, OnInit, Inject } from "@angular/core";
import { CommonModule } from "@angular/common";
import { HeaderComponent } from "./header/header.component";
import { FileTreeComponent, FileNode } from "./file-tree/file-tree.component";
import { PromptComposerComponent } from "./prompt-composer/prompt-composer.component";
import { ToastComponent } from "./toast/toast.component";
import { ToastService } from "./toast.service";
import { TauriService } from "./tauri.service";
import { LoadingSpinnerComponent } from "./loading-spinner/loading-spinner.component";
import { signal } from "@angular/core";

/**
 * Main application component that coordinates file tree loading,
 * prompt composition, and clipboard copying.
 */
@Component({
  selector: "app-root",
  standalone: true,
  imports: [
    CommonModule,
    HeaderComponent,
    FileTreeComponent,
    PromptComposerComponent,
    ToastComponent,
    LoadingSpinnerComponent,
  ],
  templateUrl: "./app.component.html",
})
export class AppComponent implements OnInit {
  // Signals for reactive state management
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

  ngOnInit(): void {
    // Initialization logic if needed
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
          this.toast.addToast("Folder selection cancelled");
          this.isLoadingFolder.set(false);
        }
      })
      .catch((error) => {
        this.toast.addToast("Error selecting folder: " + error);
        this.isLoadingFolder.set(false);
      });
  }

  onReloadFolder(): void {
    if (this.currentFolderPath) {
      this.isLoadingFolder.set(true);
      this.loadDirectoryStructure(this.currentFolderPath);
    } else {
      this.toast.addToast("No folder selected to reload");
    }
  }

  /**
   * Loads and processes the directory structure from the selected folder.
   */
  loadDirectoryStructure(folder: string): void {
    this.tauri
      .getDirectoryStructure(folder)
      .then((tree: FileNode[]) => {
        // (Optional) You can perform any client‑side post‑processing here.
        this.fileTree.set(tree);
      })
      .catch((error) => {
        this.toast.addToast("Error loading directory: " + error);
      })
      .finally(() => {
        this.isLoadingFolder.set(false);
      });
  }

  onToggleComposer(): void {
    this.showComposer.update((show) => !show);
  }

  /**
   * Toggles selection of all files in the tree.
   */
  toggleAll(): void {
    const tree = this.fileTree();
    const toggleRecursive = (nodes: FileNode[], newVal: boolean): void => {
      nodes.forEach((node) => {
        node.selected = newVal;
        if (node.children) {
          toggleRecursive(node.children, newVal);
        }
      });
    };
    const allSelected = this.allFilesSelected(tree);
    toggleRecursive(tree, !allSelected);
    this.fileTree.update((nodes) => [...nodes]);
  }

  allFilesSelected(nodes: FileNode[]): boolean {
    let all = true;
    const checkRecursive = (nodes: FileNode[]): void => {
      for (const node of nodes) {
        if (node.type === "file" && !node.selected) {
          all = false;
          return;
        }
        if (node.children) {
          checkRecursive(node.children);
        }
      }
    };
    checkRecursive(nodes);
    return all;
  }

  /**
   * Copies the prompt generated from selected files to the clipboard.
   * Now defers the heavy lifting (reading file content and formatting) to the backend.
   */
  onCopyPrompt(): void {
    if (!this.currentFolderPath) {
      this.toast.addToast("No folder selected");
      return;
    }
    const selectedFiles: { name: string; path: string }[] = [];
    const collectSelectedFiles = (nodes: FileNode[]): void => {
      nodes.forEach((node) => {
        if (node.type === "file" && node.selected) {
          selectedFiles.push({ name: node.name, path: node.path });
        }
        if (node.children) {
          collectSelectedFiles(node.children);
        }
      });
    };
    collectSelectedFiles(this.fileTree());
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

  /**
   * Handles copying of an individual file.
   * Now calls the backend to copy the formatted file content.
   */
  onIndividualCopy(file: FileNode): void {
    if (!this.currentFolderPath) {
      this.toast.addToast("No folder selected");
      return;
    }
    if (!file.selected) {
      this.toast.addToast("File not selected");
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

  onFileFormatChange(newFormat: string): void {
    this.fileFormat.set(newFormat);
  }

  onPromptFormatChange(newFormat: string): void {
    this.promptFormat.set(newFormat);
  }
}
