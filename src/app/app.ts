

import { Component, signal, ChangeDetectorRef, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CalendarUploadComponent } from './calendar-upload.component';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, CalendarUploadComponent, FormsModule],
  templateUrl: './app.html',
  styleUrl: './app.css',
  standalone: true
})
export class App {
  lang = 'en';
  t: any = {};
  cdr = inject(ChangeDetectorRef);

  constructor() {
    this.loadLang(this.lang);
  }

  async loadLang(lang: string) {
    const res = await fetch(`/assets/i18n/${lang}.json`);
  this.t = await res.json();
  this.t = { ...this.t };
  this.cdr.detectChanges();
  }

  changeLang(event: Event) {
    const value = (event.target as HTMLSelectElement).value;
    this.lang = value;
    this.loadLang(value);
  }
}
