import { Component, Output, EventEmitter, OnInit } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { OpenRouterService, Model } from "../../services/openrouter.service";
import { HttpClientModule } from "@angular/common/http";

@Component({
	selector: "app-settings-modal",
	standalone: true,
	imports: [CommonModule, FormsModule, HttpClientModule],
	template: `
		<div
			class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-opacity duration-300"
		>
			<div
				class="bg-darkbg border border-neutral-700/50 rounded-2xl shadow-xl w-full max-w-md overflow-hidden transform transition-transform duration-300 scale-100"
			>
				<!-- Header -->
				<div
					class="px-6 py-4 border-b border-neutral-700/50 flex justify-between items-center"
				>
					<h2 class="text-xl font-semibold text-white flex items-center gap-2">
						<img
							src="assets/icons/settings.svg"
							alt="settings"
							class="w-5 h-5"
						/>
						Settings
					</h2>
					<button
						(click)="onCancel()"
						class="text-neutral-300 hover:text-white transition-colors duration-150 p-1 hover:bg-neutral-700/30 rounded-lg"
					>
						<svg
							class="w-5 h-5"
							fill="none"
							stroke="#c4cad4"
							viewBox="0 0 24 24"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M6 18L18 6M6 6l12 12"
							></path>
						</svg>
					</button>
				</div>

				<!-- Content -->
				<div class="p-6 space-y-4">
					<div class="space-y-4">
						<!-- Model Selection -->
						<div class="space-y-2">
							<label class="block text-sm font-medium text-white mb-2"
								>Model</label
							>
							<div class="relative">
								<select
									[(ngModel)]="model"
									class="appearance-none w-full bg-darkprimary/50 rounded-xl px-4 py-2.5 pr-10 outline-none focus:outline-none border-2 border-transparent focus:border-indigo-500 text-white text-sm transition-all duration-150"
								>
									<option value="" disabled class="bg-darkbg text-primary">
										Select a model
									</option>
									<option
										*ngFor="let m of availableModels"
										[value]="m.id"
										class="bg-darkbg text-lightprimary py-2"
									>
										{{ m.name }}
									</option>
								</select>
							</div>
						</div>

						<!-- API Key -->
						<div class="space-y-2">
							<label class="block text-sm font-medium text-lightprimary mb-2"
								>API Key</label
							>
							<input
								type="password"
								[(ngModel)]="apiKey"
								placeholder="Enter API key"
								class="w-full bg-darkprimary/50 rounded-xl px-4 py-2.5 outline-none focus:outline-none border-2 border-transparent focus:border-indigo-500 placeholder-neutral-400 text-white text-sm transition-all duration-150"
							/>
						</div>
					</div>
				</div>

				<!-- Footer -->
				<div
					class="px-6 py-4 border-t border-neutral-700/50 flex justify-end gap-3"
				>
					<button
						(click)="onCancel()"
						class="px-4 py-2 rounded-xl hover:bg-neutral-700/50 active:bg-neutral-600/50 transition-all duration-150 text-sm font-medium border border-neutral-700/50 text-white"
					>
						Cancel
					</button>
					<button
						(click)="onSave()"
						class="bg-indigo-500 text-white px-4 py-2 rounded-xl hover:bg-indigo-600 active:bg-indigo-700 transition-all duration-150 text-sm font-medium"
					>
						Save Settings
					</button>
				</div>
			</div>
		</div>
	`,
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
				// If no model is selected and we have models available, select the first one
				if (!this.model && this.availableModels.length > 0) {
					this.model = this.availableModels[0].id;
				}
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
