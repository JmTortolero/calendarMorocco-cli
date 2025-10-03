import { Component, inject, OnInit, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { firstValueFrom } from 'rxjs';
import { TranslatePipe } from '../../core/pipes/translate.pipe';
import { Translation, Config } from '../../core/services';
import { ConfigOption } from '../../core/services/config';
import { Router } from '@angular/router';

interface PropertyFile {
  name: string;
  displayName: string;
  content?: string; // Contenido del archivo si está cargado
}

@Component({
  selector: 'app-properties-manager',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe],
  templateUrl: './propertiesManager.html',
  styleUrl: './propertiesManager.css'
})
export class PropertiesManager implements OnInit {
  loading = false;
  error: string | null = null;
  success: string | null = null;
  configLoading = false;

  // Propiedades para la gestión de archivos properties
  propertyFiles: PropertyFile[] = [];
  selectedPropertyFile: string = '';
  selectedPropertyContent: string = '';
  isLoadingPropertyContent = false;

  // Angular 20 Best Practice: inject() function + readonly
  private readonly translationService = inject(Translation);
  private readonly http = inject(HttpClient);
  private readonly configService = inject(Config);
  private readonly destroyRef = inject(DestroyRef);
  private readonly router = inject(Router);

  ngOnInit() {
    console.log('🚀 PropertiesManager: Initializing...');
    this.loadPropertyFilesList();
  }

  /**
   * Carga la lista de archivos properties disponibles
   */
  private loadPropertyFilesList() {
    this.configLoading = true;
    this.error = null;

    // Suscribirse a las opciones de configuración
    this.configService.configOptions$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(options => {
        this.configLoading = false;
        console.log('📋 PropertiesManager: Options updated:', options.length);

        // Convertir las opciones de configuración en archivos properties
        this.propertyFiles = options.map(option => ({
          name: option.value,
          displayName: this.translationService.translate(option.labelKey) || option.labelKey
        }));

        if (this.propertyFiles.length > 0) {
          console.log('✅ Property files loaded successfully:', this.propertyFiles.length);
        } else {
          console.log('⚠️ No property files available');
        }
      });

    // Suscribirse a errores de configuración
    this.configService.error$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(configError => {
        this.configLoading = false;
        if (configError) {
          console.error('❌ PropertiesManager: Configuration error:', configError);
          this.error = configError;
        }
      });

    // Iniciar la carga
    this.configService.refresh().catch(error => {
      console.error('❌ Error cargando archivos properties:', error);
      this.configLoading = false;
      this.error = 'Error loading property files';
    });
  }

  /**
   * Maneja el cambio de selección de archivo properties
   */
  onPropertyFileSelected() {
    if (!this.selectedPropertyFile) {
      this.selectedPropertyContent = '';
      return;
    }

    console.log('📂 Property file selected:', this.selectedPropertyFile);
    this.loadPropertyFileContent(this.selectedPropertyFile);
  }

  /**
   * Carga el contenido de un archivo properties
   */
  private loadPropertyFileContent(propertyFileName: string) {
    this.isLoadingPropertyContent = true;
    this.selectedPropertyContent = '';
    this.error = null;

    console.log('🔍 Loading property file content for:', propertyFileName);

    // Construir URL para obtener el contenido del archivo
    const url = `/api/config/file?name=${encodeURIComponent(propertyFileName)}`;

    this.http.get(url, { responseType: 'text' })
      .subscribe({
        next: (content: string) => {
          console.log('📄 Property file content loaded:', content.length, 'characters');
          this.selectedPropertyContent = content;
          this.isLoadingPropertyContent = false;

          // Actualizar el objeto propertyFiles con el contenido
          const fileIndex = this.propertyFiles.findIndex(file => file.name === propertyFileName);
          if (fileIndex >= 0) {
            this.propertyFiles[fileIndex].content = content;
          }
        },
        error: (error) => {
          console.error('❌ Error loading property file content:', error);
          this.error = `Error loading property file content: ${error.message || 'Unknown error'}`;
          this.isLoadingPropertyContent = false;
          this.selectedPropertyContent = '';
        }
      });
  }

  /**
   * Refresca la lista de archivos properties
   */
  refreshProperties() {
    console.log('🔄 Refreshing property files...');
    this.loadPropertyFilesList();
  }

  /**
   * Navega a la pantalla de gestión de archivos properties
   */
  goToPropertiesEditor() {
    this.router.navigate(['/properties-editor']);
  }

  /**
   * Descarga el archivo properties seleccionado
   */
  async downloadSelectedProperty() {
    if (!this.selectedPropertyFile) {
      this.error = this.translationService.translate('propertiesManager.errorNoPropertySelected');
      this.success = null;
      return;
    }

    this.loading = true;
    this.error = null;
    this.success = null;

    try {
      console.log('=== INICIO DESCARGA ARCHIVO PROPERTIES ===');
      console.log('Selected property file:', this.selectedPropertyFile);

      // Agregar extensión .properties si no la tiene
      const propertiesName = this.selectedPropertyFile.endsWith('.properties')
        ? this.selectedPropertyFile
        : `${this.selectedPropertyFile}.properties`;

      // Construir URL para descargar el archivo
      const url = `/api/config/download?name=${encodeURIComponent(propertiesName)}`;

      // Verificar conectividad del backend
      try {
        await firstValueFrom(this.http.get('/actuator/health'));
        console.log('✅ Backend conectado y funcionando');
      } catch (healthError: any) {
        if (healthError.status === 0) {
          console.log('⚠️ Posible problema de CORS, continuando de todos modos...');
        } else {
          throw new Error(`❌ Backend no disponible: ${healthError.message}`);
        }
      }

      // Enviar solicitud al backend
      const response = await firstValueFrom(this.http.get(url, {
        responseType: 'blob',
        observe: 'response'
      }));

      if (!response || response.status !== 200) {
        throw new Error(`HTTP ${response?.status}: Error en la descarga`);
      }

      const blob = response.body;
      if (!blob || blob.size === 0) {
        throw new Error('❌ Archivo vacío recibido del backend');
      }

      // Usar el nombre del archivo properties para la descarga
      const filename = propertiesName;

      // Descargar archivo
      this.downloadFile(blob, filename);

      this.success = this.translationService.translate('propertiesManager.downloadSuccess');
      console.log('=== ARCHIVO PROPERTIES DESCARGADO EXITOSAMENTE ===');    } catch (e: any) {
      console.error('=== ERROR EN DESCARGA DE ARCHIVO PROPERTIES ===', e);
      this.error = e.message || this.translationService.translate('propertiesManager.errorDownload');
    } finally {
      this.loading = false;
    }
  }

  /**
   * Descarga el archivo generado
   */
  private downloadFile(blob: Blob, filename: string): void {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setTimeout(() => {
      window.URL.revokeObjectURL(url);
    }, 100);
  }

  // Angular 20 Best Practice: Getters para acceso en el template
  get currentTranslationService() {
    return this.translationService;
  }
}
