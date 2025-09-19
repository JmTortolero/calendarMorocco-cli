import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MonitorService } from '../services/monitor.service';
import { interval, Subscription } from 'rxjs';

@Component({
  selector: 'app-monitor',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="monitor-container">
      <div class="status-indicator">
        <h3>Estado del Backend</h3>
        <div class="status-light" [class.online]="isBackendOnline" [class.offline]="!isBackendOnline">
          {{ isBackendOnline ? 'ONLINE' : 'OFFLINE' }}
        </div>
      </div>

      <div class="logs-container">
        <h3>Logs del Sistema</h3>
        <div class="logs-window">
          <div *ngFor="let log of logs" class="log-entry">
            {{ log }}
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .monitor-container {
      padding: 20px;
      border-radius: 8px;
      background: #f5f5f5;
    }

    .status-indicator {
      margin-bottom: 20px;
    }

    .status-light {
      padding: 10px 20px;
      border-radius: 4px;
      display: inline-block;
      font-weight: bold;
    }

    .online {
      background: #4CAF50;
      color: white;
    }

    .offline {
      background: #f44336;
      color: white;
    }

    .logs-container {
      background: #fff;
      border-radius: 4px;
      padding: 10px;
    }

    .logs-window {
      height: 300px;
      overflow-y: auto;
      background: #1e1e1e;
      color: #fff;
      padding: 10px;
      font-family: monospace;
    }

    .log-entry {
      margin: 5px 0;
      white-space: pre-wrap;
    }
  `]
})
export class MonitorComponent implements OnInit, OnDestroy {
  isBackendOnline = false;
  logs: string[] = [];
  private statusSubscription?: Subscription;
  private logsSubscription?: Subscription;

  constructor(private monitorService: MonitorService) {}

  ngOnInit() {
    // Verificar estado cada 30 segundos
    this.statusSubscription = interval(30000).subscribe(() => {
      this.checkBackendStatus();
    });

    // Actualizar logs cada minuto
    this.logsSubscription = interval(60000).subscribe(() => {
      this.updateLogs();
    });

    // Verificación inicial
    this.checkBackendStatus();
    this.updateLogs();
  }

  ngOnDestroy() {
    this.statusSubscription?.unsubscribe();
    this.logsSubscription?.unsubscribe();
  }

  private checkBackendStatus() {
    this.monitorService.checkBackendStatus().subscribe(
      isOnline => {
        this.isBackendOnline = isOnline;
      }
    );
  }

  private updateLogs() {
    this.monitorService.getLogs().subscribe(
      logs => {
        this.logs = logs;
      }
    );
  }
}