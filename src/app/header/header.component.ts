import { Component, Input, Output, EventEmitter } from "@angular/core";

@Component({
	selector: "app-header",
	standalone: true,
	templateUrl: "./header.component.html",
})
export class HeaderComponent {
	@Input() showComposer: boolean = true;
	@Output() selectFolder = new EventEmitter<void>();
	@Output() reloadFolder = new EventEmitter<void>();
	@Output() toggleComposer = new EventEmitter<void>();

	onSelectFolder() {
		this.selectFolder.emit();
	}

	onReloadFolder() {
		this.reloadFolder.emit();
	}

	onToggleComposer() {
		this.toggleComposer.emit();
	}
}
