import { Injectable, signal } from "@angular/core";

@Injectable({
	providedIn: "root",
})
export class ToastService {
	// Using Angular signals to maintain a list of toast messages
	toasts = signal<string[]>([]);

	addToast(message: string): void {
		this.toasts.update((current) => [...current, message]);
		// Remove the toast after 3 seconds
		setTimeout(() => {
			this.removeToast(message);
		}, 3000);
	}

	removeToast(message: string): void {
		this.toasts.update((current) => current.filter((t) => t !== message));
	}
}
