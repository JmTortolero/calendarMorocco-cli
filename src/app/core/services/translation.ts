import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class Translation {
  private readonly http = inject(HttpClient);
  private translations: { [key: string]: any } = {};
  private currentLang = 'en';
  private availableLanguages = ['en', 'ar'];

  constructor() {
    // Intentar cargar el lenguaje guardado, o usar inglés por defecto
    const savedLang = localStorage.getItem('language');
    this.currentLang = savedLang && this.availableLanguages.includes(savedLang) ? savedLang : 'en';
    this.loadTranslations(this.currentLang);
  }

  getAvailableLanguages(): string[] {
    return this.availableLanguages;
  }

  getCurrentLanguage(): string {
    return this.currentLang;
  }

  setLanguage(lang: string): void {
    if (this.availableLanguages.includes(lang)) {
      this.currentLang = lang;
      localStorage.setItem('language', lang);
      this.loadTranslations(lang);
    } else {
      console.error(`Language ${lang} not supported. Using default language.`);
    }
  }

  private loadTranslations(lang: string): void {
    const url = `assets/i18n/${lang}.json`;
    this.http.get<any>(url).pipe(
      catchError(error => {
        console.error(`Error loading translations for ${lang}:`, error);
        // Fallback to English if requested language fails to load
        if (lang !== 'en') {
          console.log('Falling back to English translations');
          return this.http.get<any>('assets/i18n/en.json');
        }
        return of({});
      })
    ).subscribe(translations => {
      this.translations = translations || {};
      console.log(`Translations loaded for ${lang}:`, this.translations);
    });
  }

  translate(key: string): string {
    if (!key) return '';

    // Navigate through nested keys (e.g. 'header.title')
    const keys = key.split('.');
    let translation: any = this.translations;

    for (const k of keys) {
      if (translation && translation[k] !== undefined) {
        translation = translation[k];
      } else {
        // Return key if translation is not found
        console.warn(`Translation not found for key: ${key}`);
        return key;
      }
    }

    return typeof translation === 'string' ? translation : key;
  }

  /**
   * Gets translations in real-time as an observable
   */
  getTranslation(key: string): Observable<string> {
    return of(this.translate(key));
  }

  /**
   * Reloads translations from the server
   */
  reloadTranslations(): Observable<any> {
    return this.http.get<any>(`assets/i18n/${this.currentLang}.json`).pipe(
      map(translations => {
        this.translations = translations || {};
        return translations;
      }),
      catchError(error => {
        console.error(`Error reloading translations for ${this.currentLang}:`, error);
        return of({});
      })
    );
  }
}
