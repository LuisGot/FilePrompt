import { Component, OnInit, signal, Inject } from "@angular/core";
import { CommonModule } from "@angular/common";
import { RouterOutlet } from "@angular/router";
import { invoke } from "@tauri-apps/api/tauri";
import { HeaderComponent } from "./header/header.component";
import { FileTreeComponent } from "./file-tree/file-tree.component";
import { PromptComposerComponent } from "./prompt-composer/prompt-composer.component";
import { ToastComponent } from "./toast/toast.component";
import { ToastService } from "./toast.service";
import { TauriEvent } from "@tauri-apps/api/event";
import { TauriService } from "./tauri.service";
import { LoadingSpinnerComponent } from "./loading-spinner/loading-spinner.component";

export interface FileNode {
  type: "folder" | "file";
  name: string;
  path: string;
  children?: FileNode[];
  selected?: boolean;
  expanded?: boolean;
  isTextFile?: boolean;
}

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
  greetingMessage = "";
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

  ngOnInit() {}

  greet(event: SubmitEvent, name: string): void {
    event.preventDefault();

    // Learn more about Tauri commands at https://v1.tauri.app/v1/guides/features/command
    invoke<string>("greet", { name }).then((text) => {
      this.greetingMessage = text;
    });
  }

  onSelectFolder() {
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

  onReloadFolder() {
    if (this.currentFolderPath) {
      this.isLoadingFolder.set(true);
      this.loadDirectoryStructure(this.currentFolderPath);
    } else {
      this.toast.addToast("No folder selected to reload");
    }
  }

  loadDirectoryStructure(folder: string) {
    this.tauri
      .getDirectoryStructure(folder)
      .then((tree: any) => {
        // Process the tree to mark text files
        const processNodes = (nodes: FileNode[]) => {
          const blockedFileExtensions = [
            // Images
            ".png",
            ".jpg",
            ".jpeg",
            ".gif",
            ".bmp",
            ".tiff",
            ".webp",
            ".ico",
            ".svg",
            // Audio
            ".mp3",
            ".wav",
            ".ogg",
            ".m4a",
            ".flac",
            ".aac",
            // Video
            ".mp4",
            ".avi",
            ".mkv",
            ".mov",
            ".wmv",
            ".flv",
            ".webm",
            // Archives
            ".zip",
            ".rar",
            ".7z",
            ".tar",
            ".gz",
            ".bz2",
            // Documents
            ".pdf",
            ".doc",
            ".docx",
            ".xls",
            ".xlsx",
            ".ppt",
            ".pptx",
            // Executables and binaries
            ".exe",
            ".dll",
            ".so",
            ".dylib",
            ".bin",
            ".dat",
            // Database files
            ".db",
            ".sqlite",
            ".mdb",
            // Font files
            ".ttf",
            ".otf",
            ".woff",
            ".woff2",
            // Other binary formats
            ".class",
            ".pyc",
            ".pyo",
            ".o",
            ".obj",
          ];

          for (const node of nodes) {
            if (node.type === "file") {
              const extension = node.name
                .toLowerCase()
                .slice(node.name.lastIndexOf("."));
              // If there's no extension or the extension is not in the blocked list, consider it a text file
              node.isTextFile =
                !extension || !blockedFileExtensions.includes(extension);
            }
            if (node.children) {
              processNodes(node.children);
            }
          }
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

  onToggleComposer() {
    this.showComposer.update((show) => !show);
  }

  toggleAll() {
    const tree = this.fileTree();
    const toggleRecursive = (nodes: FileNode[], newVal: boolean) => {
      nodes.forEach((node) => {
        node.selected = newVal;
        if (node.children && node.children.length > 0) {
          toggleRecursive(node.children, newVal);
        }
      });
    };
    const allSelected = this.allFilesSelected(tree);
    toggleRecursive(tree, !allSelected);
    this.fileTree.update((x) => [...x]);
  }

  allFilesSelected(nodes: FileNode[]): boolean {
    let all = true;
    const checkRecursive = (nodes: FileNode[]) => {
      for (const node of nodes) {
        if (node.type === "file") {
          if (!node.selected) {
            all = false;
            return;
          }
        }
        if (node.children) checkRecursive(node.children);
      }
    };
    checkRecursive(nodes);
    return all;
  }

  onCopyPrompt() {
    this.isCopying.set(true);
    const selectedFiles: FileNode[] = [];
    const collectSelectedFiles = (nodes: FileNode[]) => {
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
    const promises = selectedFiles.map((file) => {
      return this.tauri.readFile(file.path).then((content: string) => {
        let relativePath = this.currentFolderPath
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
      });
    });
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

  // Handles individual file copy from FileTree component
  onIndividualCopy(file: FileNode) {
    this.tauri.readFile(file.path).then((content: string) => {
      let relativePath = this.currentFolderPath
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
