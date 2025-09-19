import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface ConfigOption {
  label: string;
  value: string;
}

@Component({
  selector: 'app-calendar-upload',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './calendar-upload.component.html',
  styleUrl: './calendar-upload.component.css'
})
export class CalendarUploadComponent {
  excelFile: File | null = null;
  loading = false;
  error: string | null = null;
  success: string | null = null;
  
  configOptions: ConfigOption[] = [
    { label: 'Botola D1', value: 'schBotolaD1/SchMoroccoD1.properties' },
    { label: 'Botola D2', value: 'schBotolaD2/SchMoroccoD2.properties' },
    { label: 'CNPFF1', value: 'schCNPFF1/MoroccoCNPFF1.properties' },
    { label: 'CNPFF2', value: 'schCNPFF2/MoroccoCNPFF2.properties' }
  ];
  
  selectedConfig: string = '';

  onFileChange(event: Event, type: 'excel') {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.excelFile = input.files[0];
    }
  }

  async generateCalendar() {
    if (!this.excelFile || !this.selectedConfig) {
      this.error = 'Selecciona el archivo Excel y una configuración.';
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
      const response = await fetch('https://calendar-moroco.onrender.com/api/generate', {
        method: 'POST',
        body: formData
      });
      if (!response.ok) throw new Error('Error al generar el calendario');
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
      this.success = '¡Calendario generado y descargado correctamente!';
    } catch (e: any) {
      this.error = e.message || 'Error desconocido';
      this.success = null;
    } finally {
      this.loading = false;
    }
  }
}