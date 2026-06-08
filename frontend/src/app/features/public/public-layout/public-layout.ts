import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-public-layout',
  imports: [RouterOutlet, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="min-h-dvh flex flex-col bg-white text-gray-900">
      <header class="border-b border-gray-200">
        <nav class="mx-auto max-w-3xl px-4 py-4 flex items-center justify-between">
          <a routerLink="/" class="text-lg font-semibold tracking-tight">ThothAI</a>
          <a routerLink="/posts" class="text-sm text-gray-600 hover:text-gray-900">Publicações</a>
        </nav>
      </header>
      <main class="flex-1 mx-auto w-full max-w-3xl px-4 py-8">
        <router-outlet />
      </main>
      <footer class="border-t border-gray-200">
        <div class="mx-auto max-w-3xl px-4 py-6 text-sm text-gray-500">
          © {{ year }} ThothAI
        </div>
      </footer>
    </div>
  `,
})
export class PublicLayout {
  protected readonly year = new Date().getFullYear();
}
