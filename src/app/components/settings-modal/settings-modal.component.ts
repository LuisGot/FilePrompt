import { Component, Output, EventEmitter, OnInit } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { OpenRouterService, Model } from "../../services/openrouter.service";
import { HttpClientModule } from "@angular/common/http";

@Component({
	selector: "app-settings-modal",
	standalone: true,
	imports: [CommonModule, FormsModule, HttpClientModule],
	templateUrl: "./settings-modal.component.html",
})
export class SettingsModalComponent implements OnInit {
	@Output() close = new EventEmitter<void>();
	model: string = localStorage.getItem("model") || "";
	apiKey: string = localStorage.getItem("apiKey") || "";
	availableModels: Model[] = [];

	constructor(private openRouterService: OpenRouterService) {}

	ngOnInit(): void {
		this.loadModels();
	}

	loadModels(): void {
		this.openRouterService.getModels().subscribe({
			next: (response) => {
				this.availableModels = response.data;
			},
			error: (error) => {
				console.error("Error loading models:", error);
			},
		});
	}

	getSelectedModel(): Model | undefined {
		return this.availableModels.find((m) => m.id === this.model);
	}

	onSave(): void {
		localStorage.setItem("model", this.model);
		localStorage.setItem("apiKey", this.apiKey);
		this.close.emit();
	}

	onCancel(): void {
		this.close.emit();
	}
}
