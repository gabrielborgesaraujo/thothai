import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Title } from '@angular/platform-browser';

/** Página 404 pública (rota curinga, dentro do layout público). */
@Component({
  selector: 'app-not-found',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="py-16 text-center">
      <p class="text-5xl font-semibold tracking-tight text-gray-300">404</p>
      <h1 class="mt-4 text-xl font-medium">Página não encontrada</h1>
      <p class="mt-2 text-gray-600">O conteúdo que você procura não existe ou foi movido.</p>
      <a routerLink="/" class="mt-6 inline-block text-sm text-blue-600 hover:underline"
        >← Voltar ao início</a
      >
    </section>
  `,
})
export class NotFound {
  constructor() {
    inject(Title).setTitle('Página não encontrada — ThothAI');
  }
}
