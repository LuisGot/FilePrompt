import { Component } from "@angular/core";
import { CommonModule } from "@angular/common";

@Component({
  selector: "app-loading-spinner",
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="flex flex-col items-center justify-center h-full">
      <div class="relative w-20 h-20">
        <div class="absolute top-0 left-0 w-full h-full">
          <div class="w-20 h-20 border-4 border-indigo-200 rounded-full"></div>
          <div
            class="absolute top-0 left-0 w-20 h-20 border-4 border-indigo-600 rounded-full border-t-transparent animate-spin"
          ></div>
        </div>
      </div>
      <p class="mt-4 text-lightprimary text-lg">Loading files...</p>
    </div>
  `,
})
export class LoadingSpinnerComponent {}
