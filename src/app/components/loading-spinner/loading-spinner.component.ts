import { Component } from "@angular/core";
import { CommonModule } from "@angular/common";

/**
 * A simple loading spinner to indicate background activity.
 */
@Component({
  selector: "app-loading-spinner",
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="flex flex-col items-center justify-center h-full">
      <div class="relative w-20 h-20">
        <div
          class="absolute inset-0 border-4 border-indigo-200 rounded-full"
        ></div>
        <div
          class="absolute inset-0 border-4 border-indigo-500 rounded-full border-t-transparent animate-spin"
        ></div>
      </div>
      <p class="mt-4 text-lg">Loading files...</p>
    </div>
  `,
})
export class LoadingSpinnerComponent {}
