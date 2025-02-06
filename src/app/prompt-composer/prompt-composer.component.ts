import { Component, Input, Output, EventEmitter } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { CommonModule } from "@angular/common";

@Component({
  selector: "app-prompt-composer",
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: "./prompt-composer.component.html",
})
export class PromptComposerComponent {
  @Input() fileFormat!: () => string;
  @Input() promptFormat!: () => string;
  @Input() isCopying: boolean = false;
  @Output() copyPrompt = new EventEmitter<void>();
  @Output() fileFormatChange = new EventEmitter<string>();
  @Output() promptFormatChange = new EventEmitter<string>();

  localFileFormat: string = "";
  localPromptFormat: string = "";

  ngOnInit(): void {
    this.localFileFormat = this.fileFormat();
    this.localPromptFormat = this.promptFormat();
  }

  onFileFormatChange(): void {
    this.fileFormatChange.emit(this.localFileFormat);
    localStorage.setItem("fileFormat", this.localFileFormat);
  }

  onPromptFormatChange(): void {
    this.promptFormatChange.emit(this.localPromptFormat);
    localStorage.setItem("promptFormat", this.localPromptFormat);
  }

  onCopyPrompt(): void {
    this.copyPrompt.emit();
  }
}
