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
      <p class="text-6xl font-bold tracking-tight text-gray-200 dark:text-gray-800">404</p>
      <h1 class="mt-4 text-xl font-semibold">Página não encontrada</h1>
      <p class="mt-2 text-gray-600 dark:text-gray-400">
        O conteúdo que você procura não existe ou foi movido.
      </p>
      <a
        routerLink="/"
        class="mt-6 inline-block rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-500"
        >Voltar ao início</a
      >
    </section>
  `,
})
export class NotFound {
  constructor() {
    inject(Title).setTitle('Página não encontrada — ThothAI');
  }
}
