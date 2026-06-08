import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-home',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="py-8">
      <h1 class="text-3xl font-semibold tracking-tight">ThothAI</h1>
      <p class="mt-3 text-gray-600">Hub de conteúdo técnico. Em construção.</p>
    </section>
  `,
})
export class Home {}
