import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of, interval } from 'rxjs';
import { map, catchError, tap, switchMap, startWith, takeWhile } from 'rxjs/operators';

export interface Job {
  id: string;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'CANCELLED' | 'ERROR';
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  errorMessage?: string;
  resultFiles?: string[];
  progress?: number;
}

@Injectable({
  providedIn: 'root'
})
export class JobsService {
  private readonly apiUrl = '/api/jobs';
  private readonly http = inject(HttpClient);

  /**
   * Crear un job asíncrono para generar calendario
   */
  createAsyncJob(excel: string, properties: string): Observable<Job> {
    console.log('🚀 Creando job asíncrono:', { excel, properties });
    
    const params = new HttpParams()
      .set('excel', excel)
      .set('properties', properties);

    return this.http.post<Job>(`${this.apiUrl}/generate-async`, null, { params }).pipe(
      tap(job => console.log('✅ Job creado:', job)),
      catchError(error => {
        console.error('❌ Error creando job:', error);
        throw error;
      })
    );
  }

  /**
   * Obtener el estado de un job específico
   */
  getJobStatus(jobId: string): Observable<Job> {
    return this.http.get<Job>(`${this.apiUrl}/status/${jobId}`).pipe(
      tap(job => console.log(`📊 Estado del job ${jobId}:`, job)),
      catchError(error => {
        console.error(`❌ Error obteniendo estado del job ${jobId}:`, error);
        throw error;
      })
    );
  }

  /**
   * Obtener lista de todos los jobs
   */
  getAllJobs(): Observable<Job[]> {
    return this.http.get<Job[]>(`${this.apiUrl}/list`).pipe(
      tap(jobs => console.log('📋 Lista de jobs:', jobs)),
      catchError(error => {
        console.error('❌ Error obteniendo lista de jobs:', error);
        return of([]);
      })
    );
  }

  /**
   * Cancelar un job
   */
  cancelJob(jobId: string): Observable<boolean> {
    return this.http.delete<void>(`${this.apiUrl}/cancel/${jobId}`).pipe(
      map(() => true),
      tap(() => console.log(`🛑 Job ${jobId} cancelado`)),
      catchError(error => {
        console.error(`❌ Error cancelando job ${jobId}:`, error);
        return of(false);
      })
    );
  }

  /**
   * Descargar archivo de resultado de un job
   */
  downloadJobFile(jobId: string, fileName: string): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/download/${jobId}/${fileName}`, {
      responseType: 'blob'
    }).pipe(
      tap(() => console.log(`📥 Descargando archivo ${fileName} del job ${jobId}`)),
      catchError(error => {
        console.error(`❌ Error descargando archivo ${fileName} del job ${jobId}:`, error);
        throw error;
      })
    );
  }

  /**
   * Hacer polling del estado de un job hasta que termine
   * Se actualiza cada 2 segundos
   */
  pollJobStatus(jobId: string): Observable<Job> {
    return interval(2000).pipe(
      startWith(0), // Empezar inmediatamente
      switchMap(() => this.getJobStatus(jobId)),
      takeWhile(job => 
        job.status === 'PENDING' || job.status === 'RUNNING', 
        true // Incluir el último valor cuando termine
      ),
      tap(job => {
        if (job.status === 'COMPLETED') {
          console.log('🎉 Job completado:', job);
        } else if (job.status === 'ERROR') {
          console.log('💥 Job falló:', job);
        } else if (job.status === 'CANCELLED') {
          console.log('🛑 Job cancelado:', job);
        }
      })
    );
  }

  /**
   * Obtener lista de jobs con polling automático
   * Se actualiza cada 3 segundos
   */
  pollJobsList(): Observable<Job[]> {
    return interval(3000).pipe(
      startWith(0), // Empezar inmediatamente
      switchMap(() => this.getAllJobs()),
      tap(jobs => console.log('🔄 Lista de jobs actualizada:', jobs.length, 'jobs'))
    );
  }

  /**
   * Helper para descargar archivo y guardarlo
   */
  downloadAndSaveFile(jobId: string, fileName: string): void {
    this.downloadJobFile(jobId, fileName).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        console.log('💾 Archivo descargado:', fileName);
      },
      error: (error) => {
        console.error('❌ Error en descarga:', error);
      }
    });
  }

  /**
   * Helper para obtener el color del estado
   */
  getStatusColor(status: string): string {
    switch (status) {
      case 'PENDING': return 'orange';
      case 'RUNNING': return 'blue';
      case 'COMPLETED': return 'green';
      case 'ERROR': return 'red';
      case 'CANCELLED': return 'gray';
      default: return 'black';
    }
  }

  /**
   * Helper para obtener el icono del estado
   */
  getStatusIcon(status: string): string {
    switch (status) {
      case 'PENDING': return '⏳';
      case 'RUNNING': return '⚡';
      case 'COMPLETED': return '✅';
      case 'ERROR': return '❌';
      case 'CANCELLED': return '🛑';
      default: return '❓';
    }
  }
}