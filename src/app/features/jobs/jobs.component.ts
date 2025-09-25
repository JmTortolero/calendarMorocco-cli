import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil, catchError, of, interval } from 'rxjs';
import { JobsService, Job } from '../../core/services/jobs.service';
import { HeaderComponent } from '../../shared/components/header/header.component';

@Component({
  selector: 'app-jobs',
  standalone: true,
  imports: [CommonModule, FormsModule, HeaderComponent],
  templateUrl: './jobs.component.html',
  styleUrl: './jobs.component.css'
})
export class JobsComponent implements OnInit, OnDestroy {
  private readonly jobsService = inject(JobsService);
  private readonly destroy$ = new Subject<void>();

  // Lista de jobs
  jobs: Job[] = [];
  
  // Estados del componente
  isLoading = false;
  error: string | null = null;
  
  // Formulario para crear nuevo job
  showCreateForm = false;
  newJob = {
    excel: 'MoroccoBotolaD1',
    properties: 'MoroccoDiv1'
  };

  // Opciones disponibles
  excelOptions = [
    'MoroccoBotolaD1',
    'MoroccoBotolaD2',
    'MoroccoCNPFF1',
    'MoroccoCNPFF2',
    'MoroccoCNPFF2N',
    'MoroccoCNPFF2S'
  ];

  propertiesOptions = [
    'MoroccoDiv1',
    'MoroccoDiv2v1',
    'MoroccoFemDiv1',
    'MoroccoFemDiv2',
    'MoroccoFemDiv2Nord',
    'MoroccoFemDiv2Sud'
  ];

  ngOnInit() {
    console.log('🎬 JobsComponent iniciado');
    this.loadJobs();
    this.startAutoRefresh();
  }

  ngOnDestroy() {
    console.log('🛑 JobsComponent destruido');
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Cargar lista de jobs
   */
  loadJobs() {
    console.log('📋 Cargando lista de jobs...');
    this.isLoading = true;
    this.error = null;

    this.jobsService.getAllJobs().pipe(
      takeUntil(this.destroy$),
      catchError(error => {
        console.error('❌ Error cargando jobs:', error);
        this.error = 'Error cargando jobs: ' + (error.message || 'Error desconocido');
        return of([]);
      })
    ).subscribe(jobs => {
      this.jobs = jobs.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      this.isLoading = false;
      console.log('✅ Jobs cargados:', this.jobs.length);
    });
  }

  /**
   * Iniciar auto-refresh cada 3 segundos
   */
  startAutoRefresh() {
    console.log('🔄 Iniciando auto-refresh de jobs cada 3 segundos');
    
    interval(3000).pipe(
      takeUntil(this.destroy$)
    ).subscribe(() => {
      // Solo hacer refresh si no estamos cargando
      if (!this.isLoading) {
        this.loadJobs();
      }
    });
  }

  /**
   * Crear nuevo job asíncrono
   */
  createAsyncJob() {
    console.log('🚀 Creando nuevo job asíncrono:', this.newJob);
    this.isLoading = true;
    this.error = null;

    this.jobsService.createAsyncJob(this.newJob.excel, this.newJob.properties).pipe(
      takeUntil(this.destroy$),
      catchError(error => {
        console.error('❌ Error creando job:', error);
        this.error = 'Error creando job: ' + (error.message || 'Error desconocido');
        this.isLoading = false;
        return of(null);
      })
    ).subscribe(job => {
      if (job) {
        console.log('✅ Job creado exitosamente:', job);
        this.jobs.unshift(job); // Agregar al inicio de la lista
        this.showCreateForm = false;
        
        // Iniciar polling para este job específico
        this.startJobPolling(job.id);
      }
      this.isLoading = false;
    });
  }

  /**
   * Iniciar polling para un job específico
   */
  startJobPolling(jobId: string) {
    console.log(`🔄 Iniciando polling para job ${jobId}`);
    
    this.jobsService.pollJobStatus(jobId).pipe(
      takeUntil(this.destroy$),
      catchError(error => {
        console.error(`❌ Error en polling del job ${jobId}:`, error);
        return of(null);
      })
    ).subscribe(job => {
      if (job) {
        // Actualizar el job en la lista
        const index = this.jobs.findIndex(j => j.id === jobId);
        if (index !== -1) {
          this.jobs[index] = job;
          console.log(`📊 Job ${jobId} actualizado:`, job.status);
        }
      }
    });
  }

  /**
   * Cancelar un job
   */
  cancelJob(jobId: string) {
    console.log(`🛑 Cancelando job ${jobId}`);
    
    this.jobsService.cancelJob(jobId).pipe(
      takeUntil(this.destroy$),
      catchError(error => {
        console.error(`❌ Error cancelando job ${jobId}:`, error);
        this.error = `Error cancelando job: ${error.message || 'Error desconocido'}`;
        return of(false);
      })
    ).subscribe(success => {
      if (success) {
        console.log(`✅ Job ${jobId} cancelado exitosamente`);
        // Recargar la lista para ver el estado actualizado
        this.loadJobs();
      }
    });
  }

  /**
   * Descargar archivo de resultado
   */
  downloadFile(jobId: string, fileName: string) {
    console.log(`📥 Descargando archivo ${fileName} del job ${jobId}`);
    this.jobsService.downloadAndSaveFile(jobId, fileName);
  }

  /**
   * Helper: Obtener color del estado
   */
  getStatusColor(status: string): string {
    return this.jobsService.getStatusColor(status);
  }

  /**
   * Helper: Obtener icono del estado
   */
  getStatusIcon(status: string): string {
    return this.jobsService.getStatusIcon(status);
  }

  /**
   * Helper: Formatear fecha
   */
  formatDate(dateString: string): string {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }

  /**
   * Helper: Calcular duración
   */
  calculateDuration(startDate?: string, endDate?: string): string {
    if (!startDate) return 'N/A';
    
    const start = new Date(startDate);
    const end = endDate ? new Date(endDate) : new Date();
    const diffMs = end.getTime() - start.getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    
    if (diffSecs < 60) {
      return `${diffSecs}s`;
    } else if (diffSecs < 3600) {
      const mins = Math.floor(diffSecs / 60);
      const secs = diffSecs % 60;
      return `${mins}m ${secs}s`;
    } else {
      const hours = Math.floor(diffSecs / 3600);
      const mins = Math.floor((diffSecs % 3600) / 60);
      return `${hours}h ${mins}m`;
    }
  }

  /**
   * Helper: Verificar si un job puede ser cancelado
   */
  canCancel(job: Job): boolean {
    return job.status === 'PENDING' || job.status === 'RUNNING';
  }

  /**
   * Helper: Verificar si un job tiene archivos para descargar
   */
  hasDownloadableFiles(job: Job): boolean {
    return job.status === 'COMPLETED' && 
           job.resultFiles !== undefined && 
           job.resultFiles.length > 0;
  }

  /**
   * Toggle formulario de creación
   */
  toggleCreateForm() {
    this.showCreateForm = !this.showCreateForm;
    this.error = null;
  }

  /**
   * Refresh manual
   */
  refreshJobs() {
    console.log('🔄 Refresh manual de jobs');
    this.loadJobs();
  }

  /**
   * TrackBy function para optimizar ngFor
   */
  trackByJobId(index: number, job: Job): string {
    return job.id;
  }

  /**
   * Helper: Contar jobs activos
   */
  getActiveJobsCount(): number {
    return this.jobs.filter(j => j.status === 'RUNNING' || j.status === 'PENDING').length;
  }

  /**
   * Helper: Contar jobs completados
   */
  getCompletedJobsCount(): number {
    return this.jobs.filter(j => j.status === 'COMPLETED').length;
  }
}