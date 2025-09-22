import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MonitorService } from '../../core/services/monitor.service';
import { interval, Subscription } from 'rxjs';

interface EndpointStatus {
  name: string;
  url: string;
  path: string;
  status: 'checking' | 'online' | 'offline';
  message: string;
  lastChecked?: Date;
  isCustom?: boolean;
}

@Component({
  selector: 'app-monitor',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './monitor.component.html',
  styleUrls: ['./monitor.component.css']
})
export class MonitorComponent implements OnInit, OnDestroy {
  isBackendOnline = false;
  logs: string[] = [];
  customUrl = '';
  customName = '';

  endpoints: EndpointStatus[] = [
    { name: 'Raíz', url: 'http://localhost:8080', path: '', status: 'offline', message: 'No verificado' },
    { name: 'Actuator', url: 'http://localhost:8080', path: '/actuator', status: 'offline', message: 'No verificado' },
    { name: 'Health', url: 'http://localhost:8080', path: '/actuator/health', status: 'offline', message: 'No verificado' },
    { name: 'Info', url: 'http://localhost:8080', path: '/actuator/info', status: 'offline', message: 'No verificado' },
    { name: 'Mappings', url: 'http://localhost:8080', path: '/actuator/mappings', status: 'offline', message: 'No verificado' },
    { name: 'API', url: 'http://localhost:8080', path: '/api', status: 'offline', message: 'No verificado' },
    { name: 'Error', url: 'http://localhost:8080', path: '/error', status: 'offline', message: 'No verificado' }
  ];

  private statusSubscription?: Subscription;
  private logsSubscription?: Subscription;

  constructor(private monitorService: MonitorService) {}

  ngOnInit() {
    console.log('MonitorComponent inicializado - Verificación automática cada 5 segundos');

    // Verificar estado cada 2 segundos
    this.statusSubscription = interval(2000).subscribe(() => {
      console.log('Verificación automática de estado...');
      this.checkBackendStatus();
    });

    // Actualizar logs cada 5 segundos (más frecuente para debugging)
    this.logsSubscription = interval(5000).subscribe(() => {
      console.log('Actualizando logs...');
      this.updateLogs();
    });

    // Verificación inicial
    console.log('Iniciando verificación inicial...');
    this.checkBackendStatus();
    this.updateLogs();
  }

  ngOnDestroy() {
    this.statusSubscription?.unsubscribe();
    this.logsSubscription?.unsubscribe();
  }

  private checkBackendStatus() {
    console.log('Verificando estado del backend...');
    this.monitorService.checkBackendStatus().subscribe({
      next: (isOnline: boolean) => {
        console.log('Estado del backend:', isOnline ? 'ONLINE' : 'OFFLINE');
        this.isBackendOnline = isOnline;
      },
      error: (error: any) => {
        console.error('Error verificando estado:', error);
        this.isBackendOnline = false;
      }
    });
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
          `[${new Date().toISOString()}] Detalles: ${error.message}`
        ];
      }
    });
  }

  manualLogUpdate() {
    console.log('Actualización manual de logs solicitada');
    this.updateLogs();
  }

  checkEndpoint(endpoint: EndpointStatus) {
    console.log(`Verificando endpoint: ${endpoint.name} (${endpoint.url}${endpoint.path})`);
    endpoint.status = 'checking';
    endpoint.message = 'Verificando...';
    endpoint.lastChecked = new Date();

    this.monitorService.checkSingleEndpoint(endpoint.url + endpoint.path).subscribe({
      next: (response: any) => {
        endpoint.status = 'online';
        endpoint.message = response.message || 'OK - Respuesta exitosa';
        console.log(`✅ ${endpoint.name}: OK`);
      },
      error: (error: any) => {
        endpoint.status = 'offline';
        endpoint.message = error.message || `Error ${error.status || 'de conexión'}`;
        console.log(`❌ ${endpoint.name}: ${endpoint.message}`);
      }
    });
  }

  checkAllEndpoints() {
    console.log('Verificando todos los endpoints...');
    this.endpoints.forEach(endpoint => {
      this.checkEndpoint(endpoint);
    });
  }

  addCustomEndpoint() {
    if (!this.customUrl.trim()) {
      alert('Por favor, ingresa una URL válida');
      return;
    }

    const name = this.customName.trim() || `Custom ${this.endpoints.filter(e => e.isCustom).length + 1}`;

    // Verificar si ya existe un endpoint con la misma URL
    const existingEndpoint = this.endpoints.find(e =>
      e.url + e.path === this.customUrl.trim()
    );

    if (existingEndpoint) {
      alert('Este endpoint ya existe en la lista');
      return;
    }

    const newEndpoint: EndpointStatus = {
      name: name,
      url: this.customUrl.trim(),
      path: '',
      status: 'offline',
      message: 'No verificado',
      isCustom: true
    };

    this.endpoints.push(newEndpoint);

    // Limpiar los campos
    this.customUrl = '';
    this.customName = '';

    // Verificar inmediatamente el nuevo endpoint
    this.checkEndpoint(newEndpoint);

    console.log('Endpoint personalizado agregado:', newEndpoint);
  }

  removeCustomEndpoint(endpoint: EndpointStatus) {
    if (endpoint.isCustom) {
      const index = this.endpoints.indexOf(endpoint);
      if (index > -1) {
        this.endpoints.splice(index, 1);
        console.log('Endpoint personalizado eliminado:', endpoint.name);
      }
    }
  }
}
