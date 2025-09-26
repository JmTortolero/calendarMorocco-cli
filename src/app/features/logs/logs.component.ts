import { Component, OnInit, inject, DestroyRef } from '@angular/core';
import { MonitorService } from '../../core/services/monitor.service';
import { TranslatePipe } from '../../core/pipes/translate.pipe';
import { TranslationService } from '../../core/services/translation.service';
import { interval } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-logs',
  standalone: true,
  imports: [TranslatePipe], // Angular 20: No need for CommonModule with @if/@for
  templateUrl: './logs.component.html',
  styleUrl: './logs.component.css'
})
export class LogsComponent implements OnInit {
  logs: string[] = [];

  // Angular 20 Best Practice: inject() function + DestroyRef
  private readonly translationService = inject(TranslationService);
  private readonly monitorService = inject(MonitorService);
  private readonly destroyRef = inject(DestroyRef);

  ngOnInit() {
    console.log('LogsComponent inicializado - Actualización automática de logs cada 10 segundos');

    // Angular 20 Best Practice: takeUntilDestroyed()
    interval(10000)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        console.log('Actualizando logs automáticamente...');
        this.updateLogs();
      });

    // Verificación inicial
    console.log('Iniciando carga inicial de logs...');
    this.updateLogs();
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
          `[${new Date().toISOString()}] ${this.translationService.translate('error.gettingLogs')}`,
          `[${new Date().toISOString()}] ${this.translationService.translate('error.details')} ${error.message}`,
          `[${new Date().toISOString()}] ${this.translationService.translate('logs.info4')}`
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

  // Angular 20 Best Practice: Getters for template access
  get currentTranslationService() {
    return this.translationService;
  }
}
