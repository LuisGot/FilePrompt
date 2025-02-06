import { CommonModule } from "@angular/common";
import { Component, Input, Output, EventEmitter } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { BLOCKED_FILE_EXTENSIONS } from "../utils/file-extension.util";
import { TauriService } from "../tauri.service"; // <== imported for lazy loading

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

  // Inject TauriService so that we can load children on-demand
  constructor(private tauri: TauriService) {}

  /** Returns true if the filename is recognized as a text file. */
  isTextFile(filename: string): boolean {
    const extension = filename.toLowerCase().slice(filename.lastIndexOf("."));
    return !extension || !BLOCKED_FILE_EXTENSIONS.includes(extension);
  }

  toggleFolder(node: FileNode): void {
    node.expanded = !node.expanded;
    // Lazy-load folder children if not yet loaded and if expanding
    if (node.expanded && (!node.children || node.children.length === 0)) {
      this.tauri
        .getDirectoryChildren(node.path)
        .then((children: FileNode[]) => {
          node.children = children;
        })
        .catch((error) => {
          console.error("Error loading folder children", error);
        });
    }
  }

  onFileCopy(node: FileNode): void {
    if (this.isTextFile(node.name)) {
      this.fileCopy.emit(node);
    }
  }

  async onFolderSelect(node: FileNode, checked: boolean): Promise<void> {
    node.selected = checked;

    // Recursively load and select all children
    if (checked) {
      await this.loadAndSelectAllChildren(node);
    } else {
      // When deselecting, we can just update existing children
      if (node.children) {
        this.updateChildrenSelection(node.children, checked);
      }
    }
  }

  /** Recursively loads and selects all nested children */
  private async loadAndSelectAllChildren(node: FileNode): Promise<void> {
    // Load immediate children if not loaded
    if (!node.children || node.children.length === 0) {
      try {
        node.children = await this.tauri.getDirectoryChildren(node.path);
      } catch (error) {
        console.error("Error loading folder children", error);
        return;
      }
    }

    // Select all immediate children
    if (node.children) {
      for (const child of node.children) {
        child.selected = true;
        // If it's a folder, recursively load and select its children
        if (child.type === "folder") {
          await this.loadAndSelectAllChildren(child);
        }
      }
    }
  }

  /** Recursively updates selection for child nodes. */
  private updateChildrenSelection(nodes: FileNode[], checked: boolean): void {
    for (const node of nodes) {
      node.selected = checked;
      if (node.children) {
        this.updateChildrenSelection(node.children, checked);
      }
    }
  }
}
