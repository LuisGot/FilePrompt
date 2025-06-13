import { Component, Output, EventEmitter, OnInit } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { OpenRouterService, Model } from "../../services/openrouter.service";

@Component({
	selector: "app-settings-modal",
	standalone: true,
	imports: [CommonModule, FormsModule],
	templateUrl: "./settings-modal.component.html",
})
export class SettingsModalComponent implements OnInit {
	@Output() close = new EventEmitter<void>();

	model = localStorage.getItem("model") || "";
	apiKey = localStorage.getItem("apiKey") || "";
	availableModels: Model[] = [];

	constructor(private openRouterService: OpenRouterService) {}

	ngOnInit(): void {
		this.openRouterService.getModels().subscribe({
			next: ({ data }) => (this.availableModels = data),
			error: (e) => console.error("Error loading models:", e),
		});
	}

	onSave(): void {
		localStorage.setItem("model", this.model);
		localStorage.setItem("apiKey", this.apiKey);
		this.close.emit();
	}
}
