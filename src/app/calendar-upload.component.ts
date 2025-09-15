import { Component } from '@angular/core';

import { CommonModule } from '@angular/common';
@Component({
  selector: 'calendar-upload',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './calendar-upload.component.html',
  styleUrl: './calendar-upload.component.css'
})

export class CalendarUploadComponent {
  excelFile: File | null = null;
  propertiesFile: File | null = null;
  loading = false;
  error: string | null = null;
  success: string | null = null;

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
    if (!this.excelFile || !this.propertiesFile) {
      this.error = 'Selecciona ambos archivos.';
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
      formData.append('properties', this.propertiesFile);
      const response = await fetch('https://calendar-moroco.onrender.com/api/generate', {
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
