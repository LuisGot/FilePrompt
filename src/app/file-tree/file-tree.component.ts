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
  isTextFile?: boolean;
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

  /**
   * Determines whether the given filename is considered a text file.
   * @param filename - The name of the file.
   */
  isTextFile(filename: string): boolean {
    const extension = filename.toLowerCase().slice(filename.lastIndexOf("."));
    return !extension || !BLOCKED_FILE_EXTENSIONS.includes(extension);
  }

  toggleFolder(node: FileNode): void {
    node.expanded = !node.expanded;
  }

  onFileCopy(node: FileNode): void {
    // Only copy if the file is recognized as a text file.
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

  /**
   * Recursively updates the selection status for child nodes.
   */
  private updateChildrenSelection(nodes: FileNode[], checked: boolean): void {
    for (const node of nodes) {
      if (node.type === "file" && this.isTextFile(node.name)) {
        node.selected = checked;
      } else if (node.type === "folder" && node.children) {
        node.selected = checked;
        this.updateChildrenSelection(node.children, checked);
      }
    }
  }
}
