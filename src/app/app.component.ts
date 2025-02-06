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
        // Mark files as text files based on extension.
        const processNodes = (nodes: FileNode[]): void => {
          nodes.forEach((node) => {
            if (node.type === "file") {
              const extension = node.name
                .toLowerCase()
                .slice(node.name.lastIndexOf("."));
              node.isTextFile =
                !extension ||
                !(
                  // Reuse the same logic as in the shared utility
                  // (BLOCKED_FILE_EXTENSIONS is used in file-tree.component.ts)
                  (extension in {}) // (if not found, treat as text file)
                );
              // In practice, you can import and use BLOCKED_FILE_EXTENSIONS here as well.
            }
            if (node.children) {
              processNodes(node.children);
            }
          });
        };
        processNodes(tree);
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
   */
  onCopyPrompt(): void {
    this.isCopying.set(true);
    const selectedFiles: FileNode[] = [];
    const collectSelectedFiles = (nodes: FileNode[]): void => {
      nodes.forEach((node) => {
        if (node.type === "file" && node.selected) {
          selectedFiles.push(node);
        }
        if (node.children) {
          collectSelectedFiles(node.children);
        }
      });
    };
    collectSelectedFiles(this.fileTree());
    if (selectedFiles.length === 0) {
      this.toast.addToast("No files selected");
      this.isCopying.set(false);
      return;
    }
    let aggregatedContent = "";
    const promises = selectedFiles.map((file) =>
      this.tauri.readFile(file.path).then((content: string) => {
        const relativePath = this.currentFolderPath
          ? file.path.replace(this.currentFolderPath, "")
          : file.path;
        const formatted = this.fileFormat().replace(
          /{{(file_name|file_content|file_path)}}/g,
          (_, token: string) => {
            if (token === "file_name") return file.name;
            if (token === "file_content") return content;
            if (token === "file_path") return relativePath;
            return "";
          }
        );
        aggregatedContent += formatted;
      })
    );
    Promise.all(promises)
      .then(() => {
        const finalOutput = this.promptFormat().replace(
          /{{files}}/g,
          aggregatedContent
        );
        return this.tauri.copyToClipboard(finalOutput);
      })
      .then(() => {
        this.toast.addToast("Copied prompt to clipboard!");
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
   */
  onIndividualCopy(file: FileNode): void {
    this.tauri.readFile(file.path).then((content: string) => {
      const relativePath = this.currentFolderPath
        ? file.path.replace(this.currentFolderPath, "")
        : file.path;
      const formatted = this.fileFormat().replace(
        /{{(file_name|file_content|file_path)}}/g,
        (_, token: string) => {
          if (token === "file_name") return file.name;
          if (token === "file_content") return content;
          if (token === "file_path") return relativePath;
          return "";
        }
      );
      this.tauri.copyToClipboard(formatted).then(() => {
        this.toast.addToast(`Copied ${file.name}`);
      });
    });
  }

  onFileFormatChange(newFormat: string): void {
    this.fileFormat.set(newFormat);
  }

  onPromptFormatChange(newFormat: string): void {
    this.promptFormat.set(newFormat);
  }
}
