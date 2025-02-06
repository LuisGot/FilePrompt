import { CommonModule } from "@angular/common";
import { Component, Input, Output, EventEmitter } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { BLOCKED_FILE_EXTENSIONS } from "../utils/file-extension.util";

/**
 * Represents a file or folder node.
 */
export interface FileNode {
  type: "folder" | "file";
  name: string;
  path: string;
  children?: FileNode[];
  selected?: boolean;
  expanded?: boolean;
}

/**
 * The FileTreeComponent displays a recursive tree of files and folders.
 */
@Component({
  selector: "app-file-tree",
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: "./file-tree.component.html",
})
export class FileTreeComponent {
  @Input() nodes: FileNode[] = [];
  @Output() fileCopy = new EventEmitter<FileNode>();

  /** Returns true if the filename is recognized as a text file. */
  isTextFile(filename: string): boolean {
    const extension = filename.toLowerCase().slice(filename.lastIndexOf("."));
    return !extension || !BLOCKED_FILE_EXTENSIONS.includes(extension);
  }

  toggleFolder(node: FileNode): void {
    node.expanded = !node.expanded;
  }

  onFileCopy(node: FileNode): void {
    if (this.isTextFile(node.name)) {
      this.fileCopy.emit(node);
    }
  }

  onFolderSelect(node: FileNode, checked: boolean): void {
    node.selected = checked;
    if (node.children) {
      this.updateChildrenSelection(node.children, checked);
    }
  }

  /** Recursively updates selection for child nodes. */
  private updateChildrenSelection(nodes: FileNode[], checked: boolean): void {
    for (const node of nodes) {
      if (this.isTextFile(node.name)) {
        node.selected = checked;
      }
      if (node.children) {
        this.updateChildrenSelection(node.children, checked);
      }
    }
  }
}
