import { Component, inject, OnInit, DestroyRef, signal, computed, effect } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { firstValueFrom } from 'rxjs';
import { TranslatePipe } from '../../core/pipes/translate.pipe';
import { Translation, Config } from '../../core/services';
import { ConfigOption } from '../../core/services/config';

@Component({
  selector: 'app-generate-calendar',
  standalone: true,
  imports: [FormsModule, TranslatePipe], // ✅ Angular 21: Kept TranslatePipe as it's used
  templateUrl: './generateCalendar.html',
  styleUrl: './generateCalendar.css'
})
export class GenerateCalendar implements OnInit {
  // 🔥 Angular 21: Signals for reactive state management
  excelFile = signal<File | null>(null);
  loading = signal(false);
  error = signal<string | null>(null);
  success = signal<string | null>(null);
  configLoading = signal(false);
  configOptions = signal<ConfigOption[]>([]);
  selectedConfig = signal('');

  // 🔥 Angular 21: Computed signals for derived state
  hasExcelFile = computed(() => this.excelFile() !== null);
  canGenerate = computed(() => !this.loading() && this.hasExcelFile() && this.selectedConfig().length > 0 && this.configOptions().length > 0);
  hasConfigOptions = computed(() => this.configOptions().length > 0);
  isFormReady = computed(() => !this.configLoading() && this.hasConfigOptions());

  // 🔥 Angular 21: Effect for logging state changes
  private stateLogger = effect(() => {
    console.log('📊 GenerateCalendar State:', {
      hasFile: this.hasExcelFile(),
      canGenerate: this.canGenerate(),
      loading: this.loading(),
      configCount: this.configOptions().length
    });
  });

  // Angular 21: inject() function for dependency injection
  private readonly translationService = inject(Translation);
  private readonly http = inject(HttpClient);
  private readonly configService = inject(Config);
  private readonly destroyRef = inject(DestroyRef);

  ngOnInit() {
    console.log('🚀 GenerateCalendar: Initializing...');
    this.subscribeToConfigService();
  }

  /**
   * Suscribe a los observables del ConfigService
   */
  private subscribeToConfigService() {
    // Suscribirse a las opciones de configuración
    this.configService.configOptions$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(options => {
        console.log('📋 GenerateCalendar: Options updated:', options.length);
        console.log('📋 GenerateCalendar: Options details:', options);
        this.configOptions.set(options);

        // Log adicional para debugging
        if (options.length > 0) {
          console.log('✅ Config options loaded successfully:');
          options.forEach((option, index) => {
            console.log(`   ${index + 1}. ${option.labelKey} = "${option.value}"`);
          });
        } else {
          console.log('⚠️ No config options available');
        }
      });

    // Suscribirse al estado de carga
    this.configService.loading$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(loading => {
        this.configLoading.set(loading);
      });

    // Suscribirse a errores de configuración
    this.configService.error$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(configError => {
        if (configError) {
          console.error('❌ GenerateCalendar: Configuration error:', configError);
          this.error.set(configError);
        }
      });
  }

  /**
   * Refresca las opciones de configuración manualmente
   */
  async refreshConfig() {
    console.log('🔄 GenerateCalendar: Refreshing configuration...');
    try {
      await this.configService.refresh();
      this.error.set(null);
      this.success.set('Configuration updated successfully');

      // Limpiar mensaje de éxito después de 60 segundos
      setTimeout(() => {
        this.success.set(null);
      }, 60000);

    } catch (error) {
      console.error('❌ GenerateCalendar: Error refrescando configuración:', error);
      // El error se maneja automáticamente por la suscripción al configService.error$
    }
  }

  onFileChange(event: Event, type: 'excel') {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.excelFile.set(input.files[0]);
      console.log('📄 Excel file selected:', input.files[0].name);
    }
  }

  async generateCalendar() {
    console.log("🚀 Starting calendar generation...");
    console.log("📂 Excel file:", this.excelFile?.name || 'No file');
    console.log("⚙️ Selected config:", this.selectedConfig || 'No config');
    console.log("📋 Config options count:", this.configOptions.length);

    // Validaciones mejoradas
    if (!this.excelFile() || !this.selectedConfig()) {
      this.error.set(this.translationService.translate('calendar.errorFileConfig'));
      this.success.set(null);
      return;
    }
    console.log("🔍 DEBUG - Selected option:", this.selectedConfig());
    console.log("🔍 DEBUG - Available options:", this.configOptions());
    console.log("🔍 DEBUG - ConfigService current options:", this.configService.getCurrentOptions());
    console.log("🔍 DEBUG - ConfigService hasOption result:", this.configService.hasOption(this.selectedConfig()));

    // Verificar que la configuración seleccionada existe (solo si hay opciones cargadas)
    if (this.configOptions().length > 0 && !this.configService.hasOption(this.selectedConfig())) { // 🔥 Angular 21: Using signal()
      this.error.set(`Selected configuration '${this.selectedConfig()}' is not valid or no longer available. Available options: ${this.configOptions().map(o => o.value).join(', ')}`); // 🔥 Angular 21: Using signal.set()
      this.success.set(null);
      return;
    } else if (this.configOptions().length === 0) { // 🔥 Angular 21: Using signal()
      console.log('⚠️ Skipping option validation - no options loaded from backend');
      console.log('🔄 Proceeding with selected config:', this.selectedConfig());
    }

    // Verificar que hay opciones de configuración cargadas
    if (this.configOptions().length === 0) { // 🔥 Angular 21: Using signal()
      console.log('⚠️ No config options available, but allowing generation to proceed');
      console.log('💡 This might work if the backend accepts the selected config directly');
      // Solo advertir pero no bloquear
      console.warn('No configuration options loaded, proceeding anyway...');
    }
    this.loading.set(true); // 🔥 Angular 21: Using signal.set()
    this.error.set(null);
    this.success.set(null);
    try {
      // Validaciones detalladas
      console.log('=== INICIO GENERACIÓN CALENDARIO ===');
      console.log('Excel file:', this.excelFile());
      console.log('Excel file name:', this.excelFile()?.name);
      console.log('Excel file size:', this.excelFile()?.size);
      console.log('Excel file type:', this.excelFile()?.type);
      console.log('Selected config:', this.selectedConfig());
      console.log('Selected config type:', typeof this.selectedConfig());

      // Preparar nombre del archivo de propiedades
      const finalPropertiesName = this.selectedConfig().endsWith('.properties')
        ? this.selectedConfig()
        : `${this.selectedConfig()}.properties`;
      console.log('Properties name to send:', finalPropertiesName);

      if (!this.excelFile()) {
        throw new Error('No Excel file selected');
      }
      if (!this.selectedConfig()) {
        throw new Error('No configuration file selected');
      }
      const formData = new FormData();
      formData.append('excel', this.excelFile()!);

      // El backend espera el nombre del archivo de propiedades como string
      formData.append('properties', finalPropertiesName);

      console.log('FormData created successfully');
      console.log('FormData entries:');
      for (let [key, value] of formData.entries()) {
        if (value instanceof File) {
          console.log(`  ${key}: File("${value.name}", ${value.size} bytes, ${value.type})`);
        } else {
          console.log(`  ${key}: "${value}" (string)`);
        }
      }

      const apiUrl =  '/api/calendar/generate';
      console.log('API URL:', apiUrl);

      // Verificar conectividad del backend antes de enviar archivos
      console.log('🔍 Verificando conectividad del backend...');
      console.log('🌐 Health check URL:', '/actuator/health');

      try {
        const healthCheck = await firstValueFrom(this.http.get('/actuator/health'));
        console.log('✅ Backend conectado y funcionando:', healthCheck);
      } catch (healthError: any) {
        console.error('❌ Health check falló:', {
          status: healthError.status,
          message: healthError.message,
          url: healthError.url
        });

        // Si es error CORS (status 0), intentar de todos modos
        if (healthError.status === 0) {
          console.log('⚠️ Posible problema de CORS, continuando de todos modos...');
          console.log('💡 El backend parece estar corriendo, intentando la generación...');
        } else {
          throw new Error(`❌ Backend no disponible (${healthError.status}): ${healthError.message}`);
        }
      }

      console.log('🚀 Sending POST request with HttpClient...');
      console.log('🌐 Target URL:', apiUrl);
      console.log('📦 Sending FormData with entries:');
      for (let [key, value] of formData.entries()) {
        if (value instanceof File) {
          console.log(`   ${key}: File("${value.name}", ${value.size} bytes)`);
        } else {
          console.log(`   ${key}: "${value}"`);
        }
      }

      try {
        const response = await firstValueFrom(this.http.post(apiUrl, formData, {
          responseType: 'blob',
          observe: 'response',
          headers: {
            'Accept': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/octet-stream,*/*'
          }
        }));

        console.log('📨 Response received:', {
          status: response?.status,
          ok: response?.status === 200,
          headers: response?.headers.keys()
        });

        if (!response || response.status !== 200) {
          throw new Error(`HTTP ${response?.status}: Error en la descarga`);
        }

        const blob = response.body;
        if (!blob || blob.size === 0) {
          throw new Error('❌ Archivo vacío recibido del backend');
        }

        console.log('📊 Blob info:', { size: blob.size, type: blob.type });

        // Obtener nombre del archivo de los headers
        const contentDisposition = response.headers.get('Content-Disposition');
        let filename = 'calendario.xlsx';
        if (contentDisposition) {
          const matches = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
          if (matches && matches[1]) {
            filename = matches[1].replace(/['"]/g, '');
          }
        }
        console.log('📂 Filename:', filename);

        // Descargar archivo usando el método más confiable
        this.downloadFile(blob, filename);

      } catch (httpError: any) {
        console.error('🚨 HTTP Error Details:', {
          name: httpError.name,
          message: httpError.message,
          status: httpError.status,
          statusText: httpError.statusText,
          url: httpError.url,
          error: httpError.error
        });

        // Diagnóstico específico para errores comunes
        if (httpError.status === 0) {
          throw new Error(`❌ No se puede conectar al backend en ${apiUrl}. Verifica:\n` +
            `• El backend está corriendo en puerto 8080\n` +
            `• CORS está configurado correctamente\n` +
            `• No hay firewall bloqueando la conexión`);
        } else if (httpError.status === 404) {
          throw new Error(`❌ Endpoint no encontrado: ${apiUrl}\nVerifica que el backend tenga el endpoint /api/calendar/generate`);
        } else if (httpError.status === 400) {
          throw new Error(`❌ Petición incorrecta (400): ${httpError.error?.message || 'Datos inválidos enviados al backend'}`);
        } else if (httpError.status === 500) {
          throw new Error(`❌ Error interno del servidor (500): ${httpError.error?.message || 'Error procesando la petición'}`);
        } else {
          throw new Error(`❌ Error HTTP ${httpError.status}: ${httpError.statusText || httpError.message}`);
        }
      }
      this.success.set(this.translationService.translate('calendar.success'));
      console.log('=== CALENDARIO GENERADO EXITOSAMENTE ===');
    } catch (e: any) {
      console.error('=== ERROR EN GENERACIÓN DE CALENDARIO ===');
      console.error('Error object:', e);
      console.error('Error message:', e.message);
      console.error('Error stack:', e.stack);

      this.error.set(e.message || this.translationService.translate('calendar.errorUnknown'));
      this.success.set(null);
    } finally {
      this.loading.set(false);
      console.log('=== FIN GENERACIÓN CALENDARIO ===');
    }
  }

  /**
   * Método confiable para descargar archivos
   */
  private downloadFile(blob: Blob, filename: string): void {
    console.log(`📥 Iniciando descarga: ${filename} (${blob.size} bytes)`);

    try {
      // Método 1: Usando createObjectURL (más compatible)
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.style.display = 'none';

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Cleanup después de un momento
      setTimeout(() => {
        window.URL.revokeObjectURL(url);
      }, 100);

      console.log('✅ Descarga iniciada correctamente');

    } catch (error) {
      console.error('❌ Error en descarga método 1:', error);

      try {
        // Método 2: Fallback usando FileReader
        console.log('🔄 Intentando método alternativo...');
        const reader = new FileReader();
        reader.onload = () => {
          const link = document.createElement('a');
          link.href = reader.result as string;
          link.download = filename;
          link.click();
          console.log('✅ Descarga iniciada con método alternativo');
        };
        reader.readAsDataURL(blob);

      } catch (fallbackError) {
        console.error('❌ Error en método alternativo:', fallbackError);
        throw new Error('No se pudo iniciar la descarga del archivo');
      }
    }
  }

  get currentTranslationService() {
    return this.translationService;
  }
}
