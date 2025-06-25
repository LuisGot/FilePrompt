import { Component, Input, Output, EventEmitter, OnInit } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { CommonModule } from "@angular/common";
import { DragDropModule, CdkDragDrop, moveItemInArray } from "@angular/cdk/drag-drop";
import { PresetService, PromptPreset } from "../../services/preset.service";
import { FileSizePipe } from "../../pipes/file-size.pipe";
import { AbbreviateNumberPipe } from "../../pipes/abbreviate-number.pipe";
import { TauriService } from "../../services/tauri.service";
import { ToastService } from "../../services/toast.service";

@Component({
	selector: "app-prompt-composer",
	standalone: true,
    imports: [FormsModule, CommonModule, DragDropModule, FileSizePipe, AbbreviateNumberPipe],
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
    editingPresetId: string | null = null;
    editingPresetName = "";
    isEnhancing = false;
    isConverting = false;
    showConvertDropdown = false;

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

    startRename(event: Event, preset: PromptPreset): void {
        event.stopPropagation();
        this.editingPresetId = preset.id;
        this.editingPresetName = preset.name;
    }

    renamePreset(): void {
        if (this.editingPresetId) {
            const name = this.editingPresetName.trim();
            if (name) {
                this.presetService.renamePreset(this.editingPresetId, name);
                this.loadPresets();
            }
            this.editingPresetId = null;
        }
    }

    dropPreset(event: CdkDragDrop<PromptPreset[]>): void {
        moveItemInArray(this.presets, event.previousIndex, event.currentIndex);
        this.presetService.reorderPresets(this.presets);
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
		if (!this.localPromptTemplate.trim()) {
			this.toast.addToast("Please enter a prompt to enhance.");
			return;
		}

		const model = localStorage.getItem("model") || "";
		const apiKey = localStorage.getItem("apiKey") || "";

		if (!model || !apiKey) {
			this.toast.addToast(
				"Please configure your model and API key in the settings."
			);
			return;
		}

		this.isEnhancing = true;

		this.tauriService
			.enhancePrompt(model, apiKey, this.localPromptTemplate)
			.then((enhancedText: string) => {
				this.localPromptTemplate = enhancedText;
				this.onPromptTemplateChange();
				this.toast.addToast("Your prompt was successfully enhanced!");
			})
			.catch(() => {
				this.toast.addToast(
					"An error occurred while enhancing the prompt. Please try again."
				);
			})
			.finally(() => {
				this.isEnhancing = false;
			});
	}

	toggleConvertDropdown(): void {
		this.showConvertDropdown = !this.showConvertDropdown;
	}

	onConvert(format: string): void {
		if (!this.localPromptTemplate.trim()) {
			this.toast.addToast("Please enter a prompt to convert.");
			return;
		}

		const model = localStorage.getItem("model") || "";
		const apiKey = localStorage.getItem("apiKey") || "";
		if (!model || !apiKey) {
			this.toast.addToast(
				"Please configure your model and API key in the settings."
			);
			return;
		}

		this.isConverting = true;
		this.showConvertDropdown = false;

		this.tauriService
			.convertPrompt(model, apiKey, this.localPromptTemplate, format)
			.then((convertedText: string) => {
				this.localPromptTemplate = convertedText;
				this.onPromptTemplateChange();
				this.toast.addToast("Your prompt was successfully converted!");
			})
			.catch(() => {
				this.toast.addToast(
					"An error occurred while converting the prompt. Please try again."
				);
			})
			.finally(() => {
				this.isConverting = false;
			});
	}
}
