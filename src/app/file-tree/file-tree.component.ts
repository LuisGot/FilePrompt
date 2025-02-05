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

	toggleFolder(node: FileNode): void {
		node.expanded = !node.expanded;
	}

	onFileCopy(node: FileNode): void {
		this.fileCopy.emit(node);
	}
}
