import { Component, inject, OnInit, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TranslatePipe } from '../../core/pipes/translate.pipe';
import { TranslationService } from '../../core/services/translation.service';
import { ConfigService, ConfigOption } from '../../core/services/config.service';

@Component({
  selector: 'app-generate-calendar',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe],
  templateUrl: './generateCalendar.component.html',
  styleUrl: './generateCalendar.component.css'
})
export class GenerateCalendarComponent implements OnInit {
  excelFile: File | null = null;
  loading = false;
  error: string | null = null;
  success: string | null = null;
  configLoading = false;

  // Angular 20 Best Practice: inject() function + readonly
  private readonly translationService = inject(TranslationService);
  private readonly http = inject(HttpClient);
  private readonly configService = inject(ConfigService);
  private readonly destroyRef = inject(DestroyRef);

  configOptions: ConfigOption[] = [];
  selectedConfig: string = '';

  ngOnInit() {
    console.log('🚀 GenerateCalendarComponent: Initializing...');
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
        this.configOptions = options;
        
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
        this.configLoading = loading;
      });

    // Suscribirse a errores de configuración
    this.configService.error$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(configError => {
        if (configError) {
          console.error('❌ GenerateCalendar: Configuration error:', configError);
          this.error = configError;
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
      this.error = null; // Clear previous errors in this component
      this.success = 'Configuration updated successfully';

      // Limpiar mensaje de éxito después de 3 segundos
      setTimeout(() => {
        this.success = null;
      }, 3000);

    } catch (error) {
      console.error('❌ GenerateCalendar: Error refrescando configuración:', error);
      // El error se maneja automáticamente por la suscripción al configService.error$
    }
  }

  onFileChange(event: Event, type: 'excel') {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.excelFile = input.files[0];
    }
  }

  async generateCalendar() {
    console.log("🚀 Starting calendar generation...");
    console.log("📂 Excel file:", this.excelFile?.name || 'No file');
    console.log("⚙️ Selected config:", this.selectedConfig || 'No config');
    console.log("📋 Config options count:", this.configOptions.length);
    
    // Validaciones mejoradas
    if (!this.excelFile || !this.selectedConfig) {
      this.error = this.translationService.translate('calendar.errorFileConfig');
      this.success = null;
      return;
    }
    console.log("🔍 DEBUG - Selected option:", this.selectedConfig);
    console.log("🔍 DEBUG - Available options:", this.configOptions);
    console.log("🔍 DEBUG - ConfigService current options:", this.configService.getCurrentOptions());
    console.log("🔍 DEBUG - ConfigService hasOption result:", this.configService.hasOption(this.selectedConfig));
    
    // Verificar que la configuración seleccionada existe (solo si hay opciones cargadas)
    if (this.configOptions.length > 0 && !this.configService.hasOption(this.selectedConfig)) {
      this.error = `Selected configuration '${this.selectedConfig}' is not valid or no longer available. Available options: ${this.configOptions.map(o => o.value).join(', ')}`;
      this.success = null;
      return;
    } else if (this.configOptions.length === 0) {
      console.log('⚠️ Skipping option validation - no options loaded from backend');
      console.log('🔄 Proceeding with selected config:', this.selectedConfig);
    }

    // Verificar que hay opciones de configuración cargadas
    if (this.configOptions.length === 0) {
      console.log('⚠️ No config options available, but allowing generation to proceed');
      console.log('💡 This might work if the backend accepts the selected config directly');
      // Solo advertir pero no bloquear
      console.warn('No configuration options loaded, proceeding anyway...');
    }
    this.loading = true;
    this.error = null;
    this.success = null;
    try {
      const formData = new FormData();
      formData.append('excel', this.excelFile);
      formData.append('configFile', this.selectedConfig);

      const apiUrl = this.getApiUrl('/api/calendar/generate');
      console.log('Generando calendario en:', apiUrl);

      const response = await fetch(apiUrl, {
        method: 'POST',
        body: formData
      });
      if (!response.ok) throw new Error(this.translationService.translate('calendar.errorGenerate'));
      const blob = await response.blob();
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = 'calendario.xlsx';
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="?([^";]+)"?/);
        if (match) filename = match[1];
      }
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }, 100);
      this.success = this.translationService.translate('calendar.success');
    } catch (e: any) {
      this.error = e.message || this.translationService.translate('calendar.errorUnknown');
      this.success = null;
    } finally {
      this.loading = false;
    }
  }

  private getApiUrl(path: string): string {
    const isProduction = window.location.hostname !== 'localhost';
    if (isProduction) {
      return path;
    } else {
      return path;
    }
  }

  get currentTranslationService() {
    return this.translationService;
  }
}
