import { Component, OnInit, inject, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MonitorService } from '../../core/services/monitor.service';
import { TranslatePipe } from '../../core/pipes/translate.pipe';
import { TranslationService } from '../../core/services/translation.service';
import { interval } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

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
  selector: 'app-endpoints',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe],
  templateUrl: './endpoints.component.html',
  styleUrl: './endpoints.component.css'
})
export class EndpointsComponent implements OnInit {
  isBackendOnline = false;
  customUrl = '';
  customName = '';

  // Angular 20 Best Practice: inject() function + DestroyRef
  private readonly translationService = inject(TranslationService);
  private readonly monitorService = inject(MonitorService);
  private readonly destroyRef = inject(DestroyRef);

  endpoints: EndpointStatus[] = [
    { name: 'Raíz', url: '', path: '', status: 'offline', message: 'No verificado' },
    { name: 'Actuator', url: '', path: '/actuator', status: 'offline', message: 'No verificado' },
    { name: 'Health', url: '', path: '/actuator/health', status: 'offline', message: 'No verificado' },
    { name: 'Info', url: '', path: '/actuator/info', status: 'offline', message: 'No verificado' },
    { name: 'Mappings', url: '', path: '/actuator/mappings', status: 'offline', message: 'No verificado' },
    { name: 'API', url: '', path: '/api', status: 'offline', message: 'No verificado' },
    { name: 'Error', url: '', path: '/error', status: 'offline', message: 'No verificado' },
    { name: 'Test 404', url: '', path: '/endpoint-que-no-existe', status: 'offline', message: 'Test endpoint para probar errores' }
  ];

  ngOnInit() {
    console.log('EndpointsComponent inicializado - Verificación automática cada 2 segundos');

    // Angular 20 Best Practice: takeUntilDestroyed()
    interval(1000)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        console.log('Verificación automática de endpoints...');
        this.checkBackendStatus();
      });

    // Verificación inicial
    console.log('Iniciando verificación inicial de endpoints...');
    this.checkBackendStatus();
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

  checkEndpoint(endpoint: EndpointStatus) {
    console.log(`Verificando endpoint: ${endpoint.name} (${endpoint.url}${endpoint.path})`);
    endpoint.status = 'checking';
    endpoint.message = 'Verificando...';
    endpoint.lastChecked = new Date();

    this.monitorService.checkSingleEndpoint(endpoint.url + endpoint.path).subscribe({
      next: (response: any) => {
        console.log(`📡 Respuesta para ${endpoint.name}:`, response);

        // Verificar si la respuesta indica un error
        if (response.error === true || response.status >= 400) {
          endpoint.status = 'offline';
          endpoint.message = response.message || `Error HTTP ${response.status}`;
          console.log(`❌ ${endpoint.name}: OFFLINE - ${endpoint.message}`);
        } else {
          endpoint.status = 'online';
          endpoint.message = response.message || 'OK - Respuesta exitosa';
          console.log(`✅ ${endpoint.name}: ONLINE - ${endpoint.message}`);
        }
      },
      error: (error: any) => {
        endpoint.status = 'offline';
        endpoint.message = error.message || `Error ${error.status || 'de conexión'}`;
        console.log(`❌ ${endpoint.name}: ERROR - ${endpoint.message}`);
        console.error('Error completo:', error);
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
      alert(this.translationService.translate('calendar.errorFileConfig'));
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
      message: this.translationService.translate('endpoints.notVerified'),
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

  // Angular 20 Best Practice: Getters for template access
  get currentTranslationService() {
    return this.translationService;
  }
}
