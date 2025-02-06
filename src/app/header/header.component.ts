import { Component, Input, Output, EventEmitter } from "@angular/core";
import { CommonModule } from "@angular/common";

@Component({
  selector: "app-header",
  standalone: true,
  imports: [CommonModule],
  templateUrl: "./header.component.html",
})
export class HeaderComponent {
  @Input() showComposer: boolean = true;
  @Output() selectFolder = new EventEmitter<void>();
  @Output() reloadFolder = new EventEmitter<void>();
  @Output() toggleComposer = new EventEmitter<void>();
  @Output() toggleAll = new EventEmitter<void>();

  onSelectFolder() {
    this.selectFolder.emit();
  }

  onReloadFolder() {
    this.reloadFolder.emit();
  }

  onToggleComposer() {
    this.toggleComposer.emit();
  }

  onToggleAll() {
    this.toggleAll.emit();
  }
}
