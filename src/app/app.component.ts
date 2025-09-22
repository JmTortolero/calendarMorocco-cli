import { Component, signal, OnInit, OnDestroy } from '@angular/core';
import { RouterOutlet, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MonitorService } from './core/services/monitor.service';
import { interval, Subscription } from 'rxjs';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, CommonModule],
  template: `
    <nav class="navigation">
      <div class="nav-links">
        <a routerLink="/">Generar Calendario</a>
        <a class="separator">|</a>
        <a routerLink="/endpoints">End Points</a>
        <a class="separator">|</a>
        <a routerLink="/logs">Logs</a>
      </div>
      <div class="backend-status">
        <span class="status-label">Backend:</span>
        <div
          class="status-indicator"
          [class.online]="isBackendOnline"
          [class.offline]="!isBackendOnline"
        >
          {{ isBackendOnline ? 'ONLINE' : 'OFFLINE' }}
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
        }

        .backend-status {
          order: 1;
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
}
