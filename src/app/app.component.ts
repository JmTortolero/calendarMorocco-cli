import { Component, signal, OnInit, OnDestroy, inject } from '@angular/core';
import { RouterOutlet, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MonitorService } from './core/services/monitor.service';
import { TranslationService } from './core/services/translation.service';
import { TranslatePipe } from './core/pipes/translate.pipe';
import { interval, Subscription } from 'rxjs';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, CommonModule, TranslatePipe],
  template: `
    <nav class="navigation">
      <div class="nav-links">
        <a routerLink="/">{{ 'nav.generateCalendar' | translate }}</a>
        <a class="separator">|</a>
        <a routerLink="/endpoints">{{ 'nav.endpoints' | translate }}</a>
        <a class="separator">|</a>
        <a routerLink="/logs">{{ 'nav.logs' | translate }}</a>
      </div>
      <div class="nav-controls">
        <div class="language-selector">
          <button
            (click)="setLanguage('en')"
            [class.active]="translationService.currentLang === 'en'"
            class="lang-button">
            EN
          </button>
          <button
            (click)="setLanguage('ar')"
            [class.active]="translationService.currentLang === 'ar'"
            class="lang-button">
            ع
          </button>
        </div>
        <div class="backend-status">
          <span class="status-label">{{ 'nav.backend' | translate }}:</span>
          <div
            class="status-indicator"
            [class.online]="isBackendOnline"
            [class.offline]="!isBackendOnline"
          >
            {{ isBackendOnline ? ('nav.online' | translate) : ('nav.offline' | translate) }}
          </div>
        </div>
      </div>
    </nav>
    <router-outlet></router-outlet>
  `,
  styles: [
    `
      .navigation {
        padding: 1rem;
        background: #f8f9fa;
        margin-bottom: 2rem;
        display: flex;
        justify-content: space-between;
        align-items: center;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        position: sticky;
        top: 0;
        z-index: 1000;
      }

      .nav-links {
        display: flex;
        align-items: center;
        gap: 1rem;
        /* Solo los links de navegación siguen la dirección del idioma */
      }

      .nav-links a {
        text-decoration: none;
        color: #007bff;
        font-weight: 500;
        transition: color 0.3s ease;
      }

      .nav-links a:hover:not(.separator) {
        text-decoration: underline;
        color: #0056b3;
      }

      .separator {
        color: #6c757d !important;
        cursor: default;
        user-select: none;
      }

      .backend-status {
        display: flex;
        align-items: center;
        gap: 8px;
        /* Mantener dirección LTR para posición fija */
        direction: ltr !important;
      }

      .nav-controls {
        display: flex;
        align-items: center;
        gap: 15px;
        /* Forzar dirección LTR para que siempre esté en la misma posición */
        direction: ltr !important;
        text-align: right;
      }

      .language-selector {
        display: flex;
        gap: 2px;
        border: 1px solid #dee2e6;
        border-radius: 6px;
        overflow: hidden;
        /* Mantener orden fijo */
        flex-direction: row !important;
      }

      .lang-button {
        padding: 6px 12px;
        border: none;
        background: #f8f9fa;
        color: #495057;
        cursor: pointer;
        font-size: 0.9em;
        font-weight: 600;
        transition: all 0.3s ease;
        min-width: 35px;
      }

      .lang-button:hover {
        background: #e9ecef;
      }

      .lang-button.active {
        background: #007bff;
        color: white;
      }

      .status-label {
        font-weight: 600;
        color: #495057;
        font-size: 0.9em;
      }

      .status-indicator {
        padding: 6px 12px;
        border-radius: 20px;
        font-weight: bold;
        font-size: 0.8em;
        text-align: center;
        min-width: 70px;
        transition: all 0.3s ease;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      .status-indicator.online {
        background: #28a745;
        color: white;
        box-shadow: 0 0 10px rgba(40, 167, 69, 0.3);
        animation: pulse-green 2s infinite;
      }

      .status-indicator.offline {
        background: #dc3545;
        color: white;
        box-shadow: 0 0 10px rgba(220, 53, 69, 0.3);
        animation: pulse-red 2s infinite;
      }

      @keyframes pulse-green {
        0% {
          box-shadow: 0 0 10px rgba(40, 167, 69, 0.3);
        }
        50% {
          box-shadow: 0 0 20px rgba(40, 167, 69, 0.6);
        }
        100% {
          box-shadow: 0 0 10px rgba(40, 167, 69, 0.3);
        }
      }

      @keyframes pulse-red {
        0% {
          box-shadow: 0 0 10px rgba(220, 53, 69, 0.3);
        }
        50% {
          box-shadow: 0 0 20px rgba(220, 53, 69, 0.6);
        }
        100% {
          box-shadow: 0 0 10px rgba(220, 53, 69, 0.3);
        }
      }

      /* Responsive design */
      @media (max-width: 768px) {
        .navigation {
          flex-direction: column;
          gap: 1rem;
          padding: 0.8rem;
        }

        .nav-links {
          order: 2;
          /* En móvil, mantener el orden normal */
        }

        .nav-controls {
          order: 1;
          /* Mantener horizontal en móvil también */
          flex-direction: row !important;
          justify-content: center;
          gap: 15px;
          width: 100%;
        }

        .language-selector {
          /* No cambiar posición en móvil */
          align-self: auto;
        }
      }
    `,
  ],
  standalone: true,
})
export class AppComponent implements OnInit, OnDestroy {
  protected readonly title = signal('calendarMorocco-cli');
  isBackendOnline = false;
  private statusSubscription?: Subscription;

  translationService = inject(TranslationService);

  constructor(private monitorService: MonitorService) {}

  ngOnInit() {
    console.log('AppComponent inicializado - Monitoreando estado del backend');

    // Verificar estado cada 3 segundos
    this.statusSubscription = interval(3000).subscribe(() => {
      this.checkBackendStatus();
    });

    // Verificación inicial
    this.checkBackendStatus();
  }

  ngOnDestroy() {
    this.statusSubscription?.unsubscribe();
  }

  private checkBackendStatus() {
    this.monitorService.checkBackendStatus().subscribe({
      next: (isOnline: boolean) => {
        this.isBackendOnline = isOnline;
      },
      error: (error: any) => {
        console.error('Error verificando estado desde AppComponent:', error);
        this.isBackendOnline = false;
      },
    });
  }

  setLanguage(lang: 'en' | 'ar') {
    this.translationService.setLanguage(lang);
  }
}
