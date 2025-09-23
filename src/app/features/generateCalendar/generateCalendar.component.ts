import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '../../core/pipes/translate.pipe';
import { TranslationService } from '../../core/services/translation.service';
import { HttpClient } from '@angular/common/http';
import * as yaml from 'js-yaml';

interface ConfigOption {
  labelKey: string;
  value: string;
}

interface ConfigData {
  configOptions: ConfigOption[];
}

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

  translationService = inject(TranslationService);
  http = inject(HttpClient);

  configOptions: ConfigOption[] = [];

  selectedConfig: string = '';

  async ngOnInit() {
    await this.loadConfigOptions();
  }

  async loadConfigOptions() {
    try {
      // Intentar cargar desde el backend primero
      const response = await this.http.get<ConfigData>('/api/config/options').toPromise();
      this.configOptions = response?.configOptions || [];
    } catch (backendError) {
      console.warn('Backend not available, trying local YAML fallback:', backendError);

      try {
        // Fallback a archivo YAML local
        const response = await this.http.get('/assets/config/config-options.yml', { responseType: 'text' }).toPromise();
        const data = yaml.load(response as string) as ConfigData;
        this.configOptions = data.configOptions;
      } catch (yamlError) {
        console.error('Error loading config options from YAML:', yamlError);

        // Fallback final a configuración hardcodeada
        this.configOptions = [
          { labelKey: 'config.botolaD1', value: 'schBotolaD1/SchMoroccoD1.properties' },
          { labelKey: 'config.botolaD2', value: 'schBotolaD2/SchMoroccoD2.properties' },
          { labelKey: 'config.cnpff1', value: 'schCNPFF1/MoroccoCNPFF1.properties' },
          { labelKey: 'config.cnpff2', value: 'schCNPFF2/MoroccoCNPFF2.properties' }
        ];
      }
    }
  }

  onFileChange(event: Event, type: 'excel') {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.excelFile = input.files[0];
    }
  }

  async generateCalendar() {
    if (!this.excelFile || !this.selectedConfig) {
      this.error = this.translationService.translate('calendar.errorFileConfig');
      this.success = null;
      return;
    }
    this.loading = true;
    this.error = null;
    this.success = null;
    try {
      const formData = new FormData();
      formData.append('excel', this.excelFile);
      formData.append('configFile', this.selectedConfig);
      const response = await fetch('https://localhost/api/generate', {
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
}
