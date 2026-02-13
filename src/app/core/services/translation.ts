import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root',
})
export class Translation {
  private readonly http = inject(HttpClient);
  private translations: Record<string, unknown> = {};
  private currentLang = 'en';
  private readonly availableLanguages = ['en', 'ar'];
  private translationsLoaded = false;
  private readonly warnedMissingKeys = new Set<string>();

  constructor() {
    // Try saved language, fallback to English.
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
    this.translationsLoaded = false;
    this.warnedMissingKeys.clear();

    this.http
      .get<Record<string, unknown>>(url)
      .pipe(
        catchError((error) => {
          console.error(`Error loading translations for ${lang}:`, error);
          // Fallback to English if requested language fails to load.
          if (lang !== 'en') {
            console.log('Falling back to English translations');
            return this.http.get<Record<string, unknown>>('assets/i18n/en.json').pipe(
              catchError((fallbackError) => {
                console.error('Error loading fallback English translations:', fallbackError);
                return of({});
              }),
            );
          }
          return of({});
        }),
      )
      .subscribe((translations) => {
        this.translations = translations || {};
        this.translationsLoaded = true;
        console.log(`Translations loaded for ${lang}:`, this.translations);
      });
  }

  translate(key: string): string {
    if (!key) {
      return '';
    }

    const resolved = this.resolveTranslation(key);
    if (typeof resolved === 'string') {
      return resolved;
    }

    // Avoid console spam while files are still loading.
    if (this.translationsLoaded && !this.warnedMissingKeys.has(key)) {
      this.warnedMissingKeys.add(key);
      console.warn(`Translation not found for key: ${key}`);
    }

    return key;
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
    this.translationsLoaded = false;
    this.warnedMissingKeys.clear();

    return this.http.get<any>(`assets/i18n/${this.currentLang}.json`).pipe(
      map((translations) => {
        this.translations = translations || {};
        this.translationsLoaded = true;
        return translations;
      }),
      catchError((error) => {
        console.error(`Error reloading translations for ${this.currentLang}:`, error);
        this.translationsLoaded = true;
        return of({});
      }),
    );
  }

  private resolveTranslation(key: string): unknown {
    const keys = key.split('.');
    let current: unknown = this.translations;

    for (const keyPart of keys) {
      if (!current || typeof current !== 'object' || !(keyPart in current)) {
        return undefined;
      }

      current = (current as Record<string, unknown>)[keyPart];
    }

    return current;
  }
}
