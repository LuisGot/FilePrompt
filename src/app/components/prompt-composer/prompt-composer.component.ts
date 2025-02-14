import { Component, Input, Output, EventEmitter, OnInit } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { CommonModule } from "@angular/common";
import { PresetService, PromptPreset } from "../../services/preset.service";
import { FileSizePipe } from "../../pipes/file-size.pipe";
import { AbbreviateNumberPipe } from "../../pipes/abbreviate-number.pipe";
import { TauriService } from "../../services/tauri.service";
import { ToastService } from "../../services/toast.service";

@Component({
	selector: "app-prompt-composer",
	standalone: true,
	imports: [FormsModule, CommonModule, FileSizePipe, AbbreviateNumberPipe],
	templateUrl: "./prompt-composer.component.html",
})
export class PromptComposerComponent implements OnInit {
	@Input() fileFormat!: () => string;
	@Input() promptFormat!: () => string;
	@Input() isCopying = false;
	@Input() aggregatedMetrics?: {
		size: number;
		lineCount: number;
		tokenCount: number;
	};
	@Output() copyPrompt = new EventEmitter<void>();
	@Output() fileFormatChange = new EventEmitter<string>();
	@Output() promptFormatChange = new EventEmitter<string>();

	localFileFormat = "";
	localPromptFormat = "";
	presets: PromptPreset[] = [];
	showPresetsModal = false;
	showSavePresetDialog = false;
	newPresetName = "";

	constructor(
		private presetService: PresetService,
		private tauriService: TauriService,
		private toast: ToastService
	) {}

	ngOnInit(): void {
		this.localFileFormat = this.fileFormat();
		this.localPromptFormat = this.promptFormat();
		this.loadPresets();
	}

	loadPresets(): void {
		this.presets = this.presetService.getPresets();
	}

	onFileFormatChange(): void {
		this.fileFormatChange.emit(this.localFileFormat);
		localStorage.setItem("fileFormat", this.localFileFormat);
	}

	onPromptFormatChange(): void {
		this.promptFormatChange.emit(this.localPromptFormat);
		localStorage.setItem("promptFormat", this.localPromptFormat);
	}

	onCopyPrompt(): void {
		this.copyPrompt.emit();
	}

	savePreset(): void {
		if (this.newPresetName.trim()) {
			this.presetService.savePreset(
				this.newPresetName,
				this.localFileFormat,
				this.localPromptFormat
			);
			this.showSavePresetDialog = false;
			this.newPresetName = "";
			this.loadPresets();
		}
	}

	loadPreset(preset: PromptPreset): void {
		this.localFileFormat = preset.fileFormat;
		this.localPromptFormat = preset.promptFormat;
		this.onFileFormatChange();
		this.onPromptFormatChange();
		this.showPresetsModal = false;
	}

	deletePreset(event: Event, presetId: string): void {
		event.stopPropagation();
		this.presetService.deletePreset(presetId);
		this.loadPresets();
	}

	openPresetsModal(): void {
		this.showPresetsModal = true;
		this.loadPresets();
	}

	closePresetsModal(): void {
		this.showPresetsModal = false;
		this.showSavePresetDialog = false;
		this.newPresetName = "";
	}

	onEnhancePrompt(): void {
		const providerUrl = localStorage.getItem("providerUrl") || "";
		const model = localStorage.getItem("model") || "";
		const apiKey = localStorage.getItem("apiKey") || "";
		if (!providerUrl || !model || !apiKey) {
			this.toast.addToast(
				"Please set provider URL, model, and API key in settings."
			);
			return;
		}
		this.tauriService
			.enhancePrompt(providerUrl, model, apiKey, this.localPromptFormat)
			.then((enhancedText: string) => {
				this.localPromptFormat = enhancedText;
				this.onPromptFormatChange();
				this.toast.addToast("Successfully enhanced prompt!");
			})
			.catch((error: any) => {
				this.toast.addToast("Error enhancing prompt: " + error);
			});
	}
}
