import { Component, Output, EventEmitter } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";

@Component({
	selector: "app-settings-modal",
	standalone: true,
	imports: [CommonModule, FormsModule],
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
						<!-- Provider URL -->
						<div class="space-y-2">
							<label class="block text-sm font-medium text-white mb-2"
								>Provider URL</label
							>
							<input
								type="text"
								[(ngModel)]="providerUrl"
								placeholder="Enter provider URL"
								class="w-full bg-darkprimary/50 rounded-xl px-4 py-2.5 outline-none focus:outline-none border-2 border-transparent focus:border-indigo-500 placeholder-neutral-400 text-white text-sm transition-all duration-150"
							/>
						</div>

						<!-- Model Name -->
						<div class="space-y-2">
							<label class="block text-sm font-medium text-white mb-2"
								>Model Name</label
							>
							<input
								type="text"
								[(ngModel)]="model"
								placeholder="Enter model name"
								class="w-full bg-darkprimary/50 rounded-xl px-4 py-2.5 outline-none focus:outline-none border-2 border-transparent focus:border-indigo-500 placeholder-neutral-400 text-white text-sm transition-all duration-150"
							/>
						</div>

						<!-- API Key -->
						<div class="space-y-2">
							<label class="block text-sm font-medium text-white mb-2"
								>API Key</label
							>
							<input
								type="password"
								[(ngModel)]="apiKey"
								placeholder="Enter API key"
								class="w-full bg-darkprimary/50 rounded-xl px-4 py-2.5 outline-none focus:outline-none border-2 border-transparent focus:border-indigo-500 placeholder-neutral-400 text-white text-sm transition-all duration-150"
							/>
						</div>

						<!-- Ultimate Mode -->
						<div class="flex items-center justify-between">
							<div class="flex items-center gap-2">
								<label class="text-sm font-medium text-white w-fit"
									>Ultimate Prompt Mode
									<span class="text-xs text-neutral-500"
										>~5k Tokens</span
									></label
								>
							</div>
							<label
								class="relative flex items-center justify-center cursor-pointer"
							>
								<input
									type="checkbox"
									[(ngModel)]="ultimateMode"
									class="w-4 h-4 rounded-[4px] border-[1.5px] border-neutral-500 bg-transparent appearance-none cursor-pointer checked:border-indigo-500 checked:bg-indigo-500 hover:border-indigo-400 transition-all duration-150"
								/>
								<svg
									class="absolute w-2.5 h-2.5 pointer-events-none opacity-0 check-icon transition-opacity duration-150"
									[class.opacity-100]="ultimateMode"
									viewBox="0 0 12 12"
									fill="none"
									xmlns="http://www.w3.org/2000/svg"
								>
									<path
										d="M2.5 6L5 8.5L9.5 4"
										stroke="white"
										stroke-width="1.5"
										stroke-linecap="round"
										stroke-linejoin="round"
									/>
								</svg>
							</label>
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
export class SettingsModalComponent {
	@Output() close = new EventEmitter<void>();
	providerUrl: string = localStorage.getItem("providerUrl") || "";
	model: string = localStorage.getItem("model") || "";
	apiKey: string = localStorage.getItem("apiKey") || "";
	ultimateMode: boolean = localStorage.getItem("ultimateMode") === "true";

	onSave(): void {
		localStorage.setItem("providerUrl", this.providerUrl);
		localStorage.setItem("model", this.model);
		localStorage.setItem("apiKey", this.apiKey);
		localStorage.setItem("ultimateMode", this.ultimateMode.toString());
		this.close.emit();
	}

	onCancel(): void {
		this.close.emit();
	}
}
