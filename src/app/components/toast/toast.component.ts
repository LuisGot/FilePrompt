import { Component } from "@angular/core";
import { CommonModule } from "@angular/common";
import { ToastService } from "../../services/toast.service";

@Component({
	selector: "app-toast",
	standalone: true,
	imports: [CommonModule],
	templateUrl: "./toast.component.html",
})
export class ToastComponent {
	constructor(public toastService: ToastService) {}
}
