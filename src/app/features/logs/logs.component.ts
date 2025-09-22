import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MonitorService } from '../../core/services/monitor.service';
import { interval, Subscription } from 'rxjs';

@Component({
  selector: 'app-logs',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './logs.component.html',
  styleUrls: ['./logs.component.css']
})
export class LogsComponent implements OnInit, OnDestroy {
  logs: string[] = [];

  private logsSubscription?: Subscription;

  constructor(private monitorService: MonitorService) {}

  ngOnInit() {
    console.log('LogsComponent inicializado - Actualización automática de logs cada 10 segundos');

    // Actualizar logs cada 10 segundos
    this.logsSubscription = interval(10000).subscribe(() => {
      console.log('Actualizando logs automáticamente...');
      this.updateLogs();
    });

    // Verificación inicial
    console.log('Iniciando carga inicial de logs...');
    this.updateLogs();
  }

  ngOnDestroy() {
    this.logsSubscription?.unsubscribe();
  }

  private updateLogs() {
    console.log('Actualizando logs...');
    this.monitorService.getLogs().subscribe({
      next: (logs: string[]) => {
        console.log('Logs recibidos:', logs);
        this.logs = logs;
      },
      error: (error: any) => {
        console.error('Error obteniendo logs:', error);
        this.logs = [
          `[${new Date().toISOString()}] Error obteniendo logs del servidor`,
          `[${new Date().toISOString()}] Detalles: ${error.message}`,
          `[${new Date().toISOString()}] Verifica que el backend Spring Boot esté corriendo en puerto 8080`
        ];
      }
    });
  }

  manualLogUpdate() {
    console.log('Actualización manual de logs solicitada');
    this.updateLogs();
  }

  clearLogs() {
    console.log('Limpiando logs');
    this.logs = [];
  }
}
