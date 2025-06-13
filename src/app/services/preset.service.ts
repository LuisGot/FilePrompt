import { Injectable } from "@angular/core";

export interface PromptPreset {
	id: string;
	name: string;
	fileTemplate: string;
	promptTemplate: string;
}

@Injectable({
	providedIn: "root",
})
export class PresetService {
	private readonly PRESETS_KEY = "promptPresets";

	getPresets(): PromptPreset[] {
		const presetsJson = localStorage.getItem(this.PRESETS_KEY);
		return presetsJson ? JSON.parse(presetsJson) : [];
	}

	savePreset(
		name: string,
		fileTemplate: string,
		promptTemplate: string
	): PromptPreset {
		const presets = this.getPresets();
		const newPreset: PromptPreset = {
			id: crypto.randomUUID(),
			name,
			fileTemplate,
			promptTemplate,
		};
		presets.push(newPreset);
		localStorage.setItem(this.PRESETS_KEY, JSON.stringify(presets));
		return newPreset;
	}

	deletePreset(id: string): void {
		const presets = this.getPresets();
		const updatedPresets = presets.filter((preset) => preset.id !== id);
		localStorage.setItem(this.PRESETS_KEY, JSON.stringify(updatedPresets));
	}
}
