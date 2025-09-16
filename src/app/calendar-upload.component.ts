import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { CommonModule } from '@angular/common';
@Component({
  selector: 'calendar-upload',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './calendar-upload.component.html',
  styleUrl: './calendar-upload.component.css'
})

export class CalendarUploadComponent {
  excelFile: File | null = null;
  propertiesFile: File | null = null;
  loading = false;
  error: string | null = null;
  success: string | null = null;
  ejecutarApp: boolean = false;

  onFileChange(event: Event, type: 'excel' | 'properties') {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      if (type === 'excel') {
        this.excelFile = input.files[0];
      } else {
        this.propertiesFile = input.files[0];
      }
    }
  }

  async generateCalendar() {
    if (!this.excelFile) {
      this.error = 'Selecciona un archivo Excel.';
      this.success = null;
      return;
    }
    this.loading = true;
    this.error = null;
    this.success = null;
    try {
      // Llamada real al backend de calendarMoroco
      const formData = new FormData();
      formData.append('excel', this.excelFile);
      if (this.propertiesFile) {
        formData.append('properties', this.propertiesFile);
      }
      formData.append('ejecutarApp', this.ejecutarApp ? 'true' : 'false');
      const response = await fetch('http://localhost:8080/api/schedule/run', {
        method: 'POST',
        body: formData
      });
      if (!response.ok) throw new Error('Error al generar el calendario');
      // Si la respuesta es un archivo, forzar descarga
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
