import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { getAppConfig } from '../config/app.config';

export interface CompetitionOption {
  id: string;
  name: string;
  properties: string;
  enabled: boolean;
}

interface CompetitionsResponse {
  competitions: CompetitionOption[];
}

@Injectable({
  providedIn: 'root'
})
export class CompetitionCatalog {
  private readonly http = inject(HttpClient);

  private readonly _competitions = new BehaviorSubject<CompetitionOption[]>([]);
  private readonly _loading = new BehaviorSubject<boolean>(false);
  private readonly _error = new BehaviorSubject<string | null>(null);

  readonly competitions$ = this._competitions.asObservable();
  readonly loading$ = this._loading.asObservable();
  readonly error$ = this._error.asObservable();

  private _lastLoadTime = 0;
  private readonly CACHE_DURATION = 5 * 60 * 1000;

  constructor() {
    this.loadCompetitions().catch(error => {
      console.error('CompetitionCatalog: initial load failed', error);
    });
  }

  async loadCompetitions(forceReload: boolean = false): Promise<CompetitionOption[]> {
    if (!forceReload && this.isCacheValid()) {
      return this._competitions.value;
    }

    this._loading.next(true);
    this._error.next(null);

    try {
      const apiUrl = this.buildApiUrl('/competitions');
      const response = await firstValueFrom(this.http.get<CompetitionOption[] | CompetitionsResponse>(apiUrl));
      const competitions = this.normalizeResponse(response);

      this._competitions.next(competitions);
      this._lastLoadTime = Date.now();

      return competitions;
    } catch (backendError) {
      this._competitions.next([]);
      this._error.next(this.getErrorMessage(backendError));
      throw backendError;
    } finally {
      this._loading.next(false);
    }
  }

  getCurrentCompetitions(): CompetitionOption[] {
    return this._competitions.value;
  }

  hasCompetitionProperties(propertiesPath: string): boolean {
    return this._competitions.value.some(competition => competition.properties === propertiesPath);
  }

  hasCompetitionId(id: string): boolean {
    return this._competitions.value.some(competition => competition.id === id);
  }

  getCompetitionById(id: string): CompetitionOption | undefined {
    return this._competitions.value.find(competition => competition.id === id);
  }

  async refresh(): Promise<void> {
    await this.loadCompetitions(true);
  }

  clear(): void {
    this._competitions.next([]);
    this._error.next(null);
    this._loading.next(false);
    this._lastLoadTime = 0;
  }

  private normalizeResponse(response: CompetitionOption[] | CompetitionsResponse): CompetitionOption[] {
    const source = Array.isArray(response)
      ? response
      : (response?.competitions ?? []);

    return source
      .filter(item =>
        typeof item?.id === 'string' &&
        typeof item?.name === 'string' &&
        typeof item?.properties === 'string')
      .map(item => ({
        id: item.id,
        name: item.name,
        properties: item.properties,
        enabled: item.enabled !== false
      }));
  }

  private buildApiUrl(endpoint: string): string {
    const appConfig = getAppConfig();
    const baseUrl = appConfig.backend.baseUrl;
    const configPath = appConfig.api.endpoints.config;

    return `${baseUrl}${configPath}${endpoint}`;
  }

  private getBackendBaseUrl(): string {
    return environment.backend.baseUrl;
  }

  private isCacheValid(): boolean {
    return this._competitions.value.length > 0 &&
      (Date.now() - this._lastLoadTime) < this.CACHE_DURATION;
  }

  private getErrorMessage(error: any): string {
    const backendUrl = this.getBackendBaseUrl();

    if (error?.status === 0) {
      return `Backend not available: verify Spring Boot is running on ${backendUrl || 'the configured server'}`;
    }
    if (error?.status === 404) {
      return `Endpoint ${environment.api.config}/competitions not found on backend`;
    }
    if (error?.status === 403) {
      return 'CORS error while loading competitions';
    }
    if (error?.status >= 500) {
      return 'Backend internal server error while loading competitions';
    }

    return error?.message || 'Unknown error loading competitions';
  }
}
