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
	@Input() fileTemplate!: () => string;
	@Input() promptTemplate!: () => string;
	@Input() isCopying = false;
	@Input() aggregatedMetrics?: {
		size: number;
		lineCount: number;
		tokenCount: number;
	};
	@Output() copyPrompt = new EventEmitter<void>();
	@Output() fileTemplateChange = new EventEmitter<string>();
	@Output() promptTemplateChange = new EventEmitter<string>();

	localFileTemplate = "";
	localPromptTemplate = "";
	presets: PromptPreset[] = [];
	showPresetsModal = false;
	showSavePresetDialog = false;
	newPresetName = "";
	isEnhancing = false;

	constructor(
		private presetService: PresetService,
		private tauriService: TauriService,
		private toast: ToastService
	) {}

	ngOnInit(): void {
		this.localFileTemplate = this.fileTemplate();
		this.localPromptTemplate = this.promptTemplate();
		this.loadPresets();
	}

	loadPresets(): void {
		this.presets = this.presetService.getPresets();
	}

	onFileTemplateChange(): void {
		this.fileTemplateChange.emit(this.localFileTemplate);
		localStorage.setItem("fileTemplate", this.localFileTemplate);
	}

	onPromptTemplateChange(): void {
		this.promptTemplateChange.emit(this.localPromptTemplate);
		localStorage.setItem("promptTemplate", this.localPromptTemplate);
	}

	onCopyPrompt(): void {
		this.copyPrompt.emit();
	}

	savePreset(): void {
		if (this.newPresetName.trim()) {
			this.presetService.savePreset(
				this.newPresetName,
				this.localFileTemplate,
				this.localPromptTemplate
			);
			this.showSavePresetDialog = false;
			this.newPresetName = "";
			this.loadPresets();
		}
	}

	loadPreset(preset: PromptPreset): void {
		this.localFileTemplate = preset.fileTemplate;
		this.localPromptTemplate = preset.promptTemplate;
		this.onFileTemplateChange();
		this.onPromptTemplateChange();
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
		const model = localStorage.getItem("model") || "";
		const apiKey = localStorage.getItem("apiKey") || "";

		if (!model || !apiKey) {
			this.toast.addToast("Please set model and API key in settings.");
			return;
		}

		this.isEnhancing = true;

		this.tauriService
			.enhancePrompt(model, apiKey, this.localPromptTemplate)
			.then((enhancedText: string) => {
				this.localPromptTemplate = enhancedText;
				this.onPromptTemplateChange();
				this.toast.addToast("Successfully enhanced prompt!");
			})
			.catch((error: any) => {
				this.toast.addToast("Error enhancing prompt: " + error);
			})
			.finally(() => {
				this.isEnhancing = false;
			});
	}
}
