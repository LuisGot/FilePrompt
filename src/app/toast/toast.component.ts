import { Component } from "@angular/core";
import { CommonModule } from "@angular/common";
import { ToastService } from "../toast.service";

/**
 * The ToastComponent displays temporary notification messages.
 */
@Component({
  selector: "app-toast",
  standalone: true,
  imports: [CommonModule],
  templateUrl: "./toast.component.html",
})
export class ToastComponent {
  constructor(public toastService: ToastService) {}

  remove(toast: string): void {
    this.toastService.removeToast(toast);
  }
}
