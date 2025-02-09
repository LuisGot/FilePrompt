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
import { FileSizePipe } from "../../pipes/file-size.pipe";
import { AbbreviateNumberPipe } from "../../pipes/abbreviate-number.pipe";

/** Represents a file or folder node. */
export interface FileNode {
	type: "folder" | "file";
	name: string;
	path: string;
	children?: FileNode[];
	selected?: boolean;
	expanded?: boolean;
	tokenCount?: number;
	fileSize?: number;
	lineCount?: number;
	validText?: boolean;
}

/** Displays a recursive file tree. */
@Component({
	selector: "app-file-tree",
	standalone: true,
	imports: [FormsModule, CommonModule, FileSizePipe, AbbreviateNumberPipe],
	templateUrl: "./file-tree.component.html",
})
export class FileTreeComponent implements OnChanges {
	@Input() nodes: FileNode[] = [];
	@Output() fileCopy = new EventEmitter<FileNode>();

	constructor(private tauri: TauriService) {}

	/** Returns true for files that have a text file extension and valid UTF‑8 content.
	 * If the file’s validText property is explicitly false, then it is not considered a valid text file.
	 */
	isTextFile(node: FileNode): boolean {
		if (node.validText === false) return false;
		const extension = node.name.toLowerCase().slice(node.name.lastIndexOf("."));
		return !extension || !BLOCKED_FILE_EXTENSIONS.includes(extension);
	}

	/** Handle input changes; load file metrics asynchronously. */
	ngOnChanges(changes: SimpleChanges): void {
		if (changes["nodes"]) {
			(async () => {
				await this.loadFileMetrics(this.nodes);
			})();
		}
	}

	/**
	 * Recursively collect all file nodes that are text files and missing metrics.
	 */
	private collectFileNodes(nodes: FileNode[]): FileNode[] {
		let results: FileNode[] = [];
		for (const node of nodes) {
			if (
				node.type === "file" &&
				this.isTextFile(node) &&
				(node.tokenCount === undefined ||
					node.fileSize === undefined ||
					node.lineCount === undefined)
			) {
				results.push(node);
			}
			if (node.children && node.children.length > 0) {
				results = results.concat(this.collectFileNodes(node.children));
			}
		}
		return results;
	}

	/**
	 * Load file metrics (size, line count, token count) for all text file nodes concurrently.
	 */
	private async loadFileMetrics(nodes: FileNode[]): Promise<void> {
		const fileNodes = this.collectFileNodes(nodes);
		if (fileNodes.length === 0) return;
		const filePaths = fileNodes.map((node) => node.path);
		try {
			const metrics = await this.tauri.getFileMetrics(filePaths);
			// Match each returned metric with the corresponding file node
			for (const metric of metrics) {
				const node = fileNodes.find((n) => n.path === metric.file_path);
				if (node) {
					node.tokenCount = metric.token_count;
					node.fileSize = metric.size;
					node.lineCount = metric.line_count;
					// Set the validText flag based on whether the file was read as valid UTF-8
					node.validText = metric.is_valid;
				}
			}
		} catch (error) {
			console.error("Error getting file metrics:", error);
		}
	}

	/** Toggle folder expansion and load children if needed. */
	async toggleFolder(node: FileNode): Promise<void> {
		node.expanded = !node.expanded;
		if (node.expanded && (!node.children || node.children.length === 0)) {
			try {
				node.children = await this.tauri.getDirectoryChildren(node.path);
				if (node.children) {
					// Load metrics for the newly loaded children
					await this.loadFileMetrics(node.children);
				}
			} catch (error) {
				console.error("Error loading folder children", error);
			}
		}
	}

	/** Emit file copy event if file is a valid text file. */
	onFileCopy(node: FileNode): void {
		if (this.isTextFile(node)) {
			this.fileCopy.emit(node);
		}
	}

	/** Toggle folder selection and recursively update children. */
	onFolderSelect(node: FileNode, checked: boolean): void {
		node.selected = checked;
		if (checked) {
			this.loadAndSelectAllChildren(node);
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
					this.loadAndSelectAllChildren(child).catch((error) =>
						console.error("Error loading subfolder children", error)
					);
				}
			}
			this.loadFileMetrics(node.children).catch((error) =>
				console.error("Error loading file metrics", error)
			);
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
