import { Pipe, PipeTransform } from "@angular/core";

@Pipe({
	name: "abbreviateNumber",
	standalone: true,
})
export class AbbreviateNumberPipe implements PipeTransform {
	transform(value: number): string {
		if (value < 1000) return value.toString();
		if (value < 1_000_000)
			return (value / 1000).toFixed(1).replace(/\.0$/, "") + "k";
		if (value < 1_000_000_000)
			return (value / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
		return (value / 1_000_000_000).toFixed(1).replace(/\.0$/, "") + "B";
	}
}
