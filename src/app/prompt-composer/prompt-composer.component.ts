import { Component, Input, Output, EventEmitter } from "@angular/core";
import { FormsModule } from "@angular/forms";

@Component({
	selector: "app-prompt-composer",
	standalone: true,
	imports: [FormsModule],
	templateUrl: "./prompt-composer.component.html",
})
export class PromptComposerComponent {
	@Input() fileFormat!: () => string;
	@Input() promptFormat!: () => string;
	@Output() copyPrompt = new EventEmitter<void>();

	localFileFormat: string = "";
	localPromptFormat: string = "";

	ngOnInit(): void {
		this.localFileFormat = this.fileFormat();
		this.localPromptFormat = this.promptFormat();
	}

	onCopyPrompt(): void {
		this.copyPrompt.emit();
	}
}
