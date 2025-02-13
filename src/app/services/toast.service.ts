import { Injectable, signal } from "@angular/core";

@Injectable({
	providedIn: "root",
})
export class ToastService {
	toasts = signal<string[]>([]);

	addToast(message: string): void {
		this.toasts.update((current) => [...current, message]);
		setTimeout(() => {
			this.removeToast(message);
		}, 3000);
	}

	removeToast(message: string): void {
		this.toasts.update((current) => current.filter((t) => t !== message));
	}
}
