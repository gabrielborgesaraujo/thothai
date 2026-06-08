import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-dashboard',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<p class="text-gray-600">Bem-vindo ao painel. Gerencie suas postagens e perfil.</p>`,
})
export class Dashboard {}
