import { Component, signal } from '@angular/core';
import { RouterOutlet, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, CommonModule],
  template: `
    <nav class="navigation">
      <a routerLink="/">Calendario</a>
      <a routerLink="/monitor">Monitor</a>
    </nav>
    <router-outlet></router-outlet>
  `,
  styles: [`
    .navigation {
      padding: 1rem;
      background: #f8f9fa;
      margin-bottom: 2rem;
    }
    .navigation a {
      margin-right: 1rem;
      text-decoration: none;
      color: #007bff;
    }
    .navigation a:hover {
      text-decoration: underline;
    }
  `],
  standalone: true
})
export class AppComponent {
  protected readonly title = signal('calendarMorocco-cli');
}