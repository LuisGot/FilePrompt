import { Component, OnInit, Inject } from "@angular/core";
import { signal } from "@angular/core";
import { HeaderComponent } from "./header/header.component";
import { FileTreeComponent, FileNode } from "./file-tree/file-tree.component";
import { PromptComposerComponent } from "./prompt-composer/prompt-composer.component";
import { ToastComponent } from "./toast/toast.component";
import { ToastService } from "./toast.service";
import { TauriService } from "./tauri.service";
import { LoadingSpinnerComponent } from "./loading-spinner/loading-spinner.component";
import { CommonModule } from "@angular/common";

/**
 * Main application component coordinating file tree loading, prompt composition, and clipboard copying.
 */
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
      "File: {{file_name}}\nPath: \\src\\app\\app.component.ts\nContent:\n{{file_content}}\n\n"
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
    // Additional initialization logic if needed.
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

  // Load only the top-level children of the selected folder.
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

  onToggleComposer(): void {
    this.showComposer.update((show) => !show);
  }

  private toggleSelectionRecursive(nodes: FileNode[], selected: boolean): void {
    nodes.forEach((node) => {
      node.selected = selected;
      if (node.children) {
        this.toggleSelectionRecursive(node.children, selected);
      }
    });
  }

  private areAllFilesSelected(nodes: FileNode[]): boolean {
    let all = true;
    const checkSelection = (nodes: FileNode[]): void => {
      for (const node of nodes) {
        if (node.type === "file" && !node.selected) {
          all = false;
          return;
        }
        if (node.children) {
          checkSelection(node.children);
        }
      }
    };
    checkSelection(nodes);
    return all;
  }

  onCopyPrompt(): void {
    if (!this.currentFolderPath) {
      this.toast.addToast("No folder selected");
      return;
    }
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

  onFileFormatChange(newFormat: string): void {
    this.fileFormat.set(newFormat);
  }

  onPromptFormatChange(newFormat: string): void {
    this.promptFormat.set(newFormat);
  }
}
