import { Pipe, PipeTransform } from "@angular/core";

@Pipe({
	name: "fileSize",
	standalone: true,
})
export class FileSizePipe implements PipeTransform {
	transform(size: number): string {
		if (size < 1024) return size + " B";
		if (size < 1024 * 1024)
			return (size / 1024).toFixed(1).replace(/\.0$/, "") + " KB";
		if (size < 1024 * 1024 * 1024)
			return (size / (1024 * 1024)).toFixed(1).replace(/\.0$/, "") + " MB";
		return (size / (1024 * 1024 * 1024)).toFixed(1).replace(/\.0$/, "") + " GB";
	}
}
