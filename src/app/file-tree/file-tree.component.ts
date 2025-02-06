import { CommonModule } from "@angular/common";
import { Component, Input, Output, EventEmitter } from "@angular/core";
import { FormsModule } from "@angular/forms";

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
  selector: "app-file-tree",
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: "./file-tree.component.html",
})
export class FileTreeComponent {
  @Input() nodes: FileNode[] = [];
  @Output() fileCopy = new EventEmitter<FileNode>();

  // List of file extensions that should not be treated as text files
  private blockedFileExtensions = [
    // Images
    ".png",
    ".jpg",
    ".jpeg",
    ".gif",
    ".bmp",
    ".tiff",
    ".webp",
    ".ico",
    ".icns",
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

  isTextFile(filename: string): boolean {
    const extension = filename.toLowerCase().slice(filename.lastIndexOf("."));
    // If there's no extension or the extension is not in the blocked list, consider it a text file
    return !extension || !this.blockedFileExtensions.includes(extension);
  }

  toggleFolder(node: FileNode): void {
    node.expanded = !node.expanded;
  }

  onFileCopy(node: FileNode): void {
    if (node.isTextFile) {
      this.fileCopy.emit(node);
    }
  }

  // New method to handle folder selection
  onFolderSelect(node: FileNode, checked: boolean): void {
    // Update the folder's selected state
    node.selected = checked;

    // If it has children, recursively update their selected state
    if (node.children) {
      this.updateChildrenSelection(node.children, checked);
    }
  }

  // Helper method to recursively update children selection
  private updateChildrenSelection(nodes: FileNode[], checked: boolean): void {
    for (const node of nodes) {
      if (node.type === "file") {
        // Only allow selection of text files
        if (this.isTextFile(node.name)) {
          node.selected = checked;
        }
      } else if (node.type === "folder" && node.children) {
        node.selected = checked;
        this.updateChildrenSelection(node.children, checked);
      }
    }
  }
}
