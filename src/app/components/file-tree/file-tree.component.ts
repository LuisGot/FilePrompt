import { CommonModule } from "@angular/common";
import {
	Component,
	Input,
	Output,
	EventEmitter,
	OnChanges,
	SimpleChanges,
} from "@angular/core";
import { FormsModule } from "@angular/forms";
import { BLOCKED_FILE_EXTENSIONS } from "../../utils/file-extension.util";
import { TauriService } from "../../services/tauri.service";

/** Represents a file or folder node. */
export interface FileNode {
	type: "folder" | "file";
	name: string;
	path: string;
	children?: FileNode[];
	selected?: boolean;
	expanded?: boolean;
	tokenCount?: number;
}

/** Displays a recursive file tree. */
@Component({
	selector: "app-file-tree",
	standalone: true,
	imports: [FormsModule, CommonModule],
	templateUrl: "./file-tree.component.html",
})
export class FileTreeComponent implements OnChanges {
	@Input() nodes: FileNode[] = [];
	@Output() fileCopy = new EventEmitter<FileNode>();

	constructor(private tauri: TauriService) {}

	/** Returns true for text file types. */
	isTextFile(filename: string): boolean {
		const extension = filename.toLowerCase().slice(filename.lastIndexOf("."));
		return !extension || !BLOCKED_FILE_EXTENSIONS.includes(extension);
	}

	/** Handle input changes; load token counts asynchronously. */
	ngOnChanges(changes: SimpleChanges): void {
		if (changes["nodes"]) {
			(async () => {
				await this.loadTokenCounts(this.nodes);
			})();
		}
	}

	/** Recursively load token counts for text files asynchronously. */
	private async loadTokenCounts(nodes: FileNode[]): Promise<void> {
		for (const node of nodes) {
			if (
				node.type === "file" &&
				this.isTextFile(node.name) &&
				node.tokenCount === undefined
			) {
				try {
					node.tokenCount = await this.tauri.getTokenCount(node.path);
				} catch (error) {
					console.error(`Error getting token count for ${node.name}:`, error);
				}
			}
			if (node.children && node.children.length > 0) {
				await this.loadTokenCounts(node.children);
			}
		}
	}

	/** Toggle folder expansion and load children if needed. */
	async toggleFolder(node: FileNode): Promise<void> {
		node.expanded = !node.expanded;
		if (node.expanded && (!node.children || node.children.length === 0)) {
			try {
				node.children = await this.tauri.getDirectoryChildren(node.path);
				if (node.children) {
					await this.loadTokenCounts(node.children);
				}
			} catch (error) {
				console.error("Error loading folder children", error);
			}
		}
	}

	/** Emit file copy event if file is text. */
	onFileCopy(node: FileNode): void {
		if (this.isTextFile(node.name)) {
			this.fileCopy.emit(node);
		}
	}

	/** Toggle folder selection and recursively update children. */
	async onFolderSelect(node: FileNode, checked: boolean): Promise<void> {
		node.selected = checked;
		if (checked) {
			await this.loadAndSelectAllChildren(node);
		} else {
			if (node.children) {
				this.updateChildrenSelection(node.children, checked);
			}
		}
	}

	/** Recursively load and select nested children. */
	private async loadAndSelectAllChildren(node: FileNode): Promise<void> {
		if (!node.children || node.children.length === 0) {
			try {
				node.children = await this.tauri.getDirectoryChildren(node.path);
			} catch (error) {
				console.error("Error loading folder children", error);
				return;
			}
		}
		if (node.children) {
			for (const child of node.children) {
				child.selected = true;
				if (child.type === "folder") {
					await this.loadAndSelectAllChildren(child);
				}
			}
		}
	}

	/** Recursively update selection for child nodes. */
	private updateChildrenSelection(nodes: FileNode[], checked: boolean): void {
		for (const node of nodes) {
			node.selected = checked;
			if (node.children) {
				this.updateChildrenSelection(node.children, checked);
			}
		}
	}
}
