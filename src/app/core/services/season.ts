import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { getAppConfig } from '../config/app.config';

export interface SeasonOption {
  id: string;
  label: string;
  enabled: boolean;
  current: boolean;
}

type SeasonApiItem =
  | string
  | {
    id?: string;
    value?: string;
    season?: string;
    label?: string;
    name?: string;
    enabled?: boolean;
    current?: boolean;
  };

type SeasonsResponse =
  | SeasonApiItem[]
  | {
    seasons?: SeasonApiItem[];
    items?: SeasonApiItem[];
    values?: SeasonApiItem[];
  };

@Injectable({
  providedIn: 'root'
})
export class SeasonCatalog {
  private readonly http = inject(HttpClient);

  private readonly _seasons = new BehaviorSubject<SeasonOption[]>([]);
  private readonly _loading = new BehaviorSubject<boolean>(false);
  private readonly _error = new BehaviorSubject<string | null>(null);

  readonly seasons$ = this._seasons.asObservable();
  readonly loading$ = this._loading.asObservable();
  readonly error$ = this._error.asObservable();

  private _lastLoadTime = 0;
  private readonly CACHE_DURATION = 5 * 60 * 1000;

  async loadSeasons(forceReload: boolean = false): Promise<SeasonOption[]> {
    if (!forceReload && this.isCacheValid()) {
      return this._seasons.value;
    }

    this._loading.next(true);
    this._error.next(null);

    try {
      const apiUrl = this.buildApiUrl('/seasons');
      const response = await firstValueFrom(this.http.get<SeasonsResponse>(apiUrl));
      const seasons = this.normalizeResponse(response);

      this._seasons.next(seasons);
      this._lastLoadTime = Date.now();
      return seasons;
    } catch (backendError) {
      this._seasons.next([]);
      this._error.next(this.getErrorMessage(backendError));
      throw backendError;
    } finally {
      this._loading.next(false);
    }
  }

  async refresh(): Promise<void> {
    await this.loadSeasons(true);
  }

  getCurrentSeasons(): SeasonOption[] {
    return this._seasons.value;
  }

  hasSeasonId(seasonId: string): boolean {
    return this._seasons.value.some(season => season.enabled && season.id === seasonId);
  }

  getPreferredSeason(fallbackSeasonId?: string): string {
    const enabledSeasons = this._seasons.value.filter(season => season.enabled);
    if (fallbackSeasonId && enabledSeasons.some(season => season.id === fallbackSeasonId)) {
      return fallbackSeasonId;
    }

    const currentSeason = enabledSeasons.find(season => season.current);
    if (currentSeason) {
      return currentSeason.id;
    }

    return enabledSeasons[0]?.id ?? '';
  }

  clear(): void {
    this._seasons.next([]);
    this._error.next(null);
    this._loading.next(false);
    this._lastLoadTime = 0;
  }

  private normalizeResponse(response: SeasonsResponse): SeasonOption[] {
    const source = this.extractSource(response);
    const normalized = source
      .map(item => this.normalizeItem(item))
      .filter((item): item is SeasonOption => item !== null)
      .filter(item => item.enabled);

    const deduped = new Map<string, SeasonOption>();
    for (const season of normalized) {
      if (!deduped.has(season.id)) {
        deduped.set(season.id, season);
      }
    }

    return Array.from(deduped.values()).sort((a, b) => {
      if (a.current !== b.current) {
        return a.current ? -1 : 1;
      }
      return this.toSeasonSortKey(b.id) - this.toSeasonSortKey(a.id);
    });
  }

  private extractSource(response: SeasonsResponse): SeasonApiItem[] {
    if (Array.isArray(response)) {
      return response;
    }

    if (response && Array.isArray(response.seasons)) {
      return response.seasons;
    }

    if (response && Array.isArray(response.items)) {
      return response.items;
    }

    if (response && Array.isArray(response.values)) {
      return response.values;
    }

    return [];
  }

  private normalizeItem(item: SeasonApiItem): SeasonOption | null {
    if (typeof item === 'string') {
      const id = item.trim();
      if (!id) {
        return null;
      }

      return {
        id,
        label: id,
        enabled: true,
        current: false
      };
    }

    if (!item || typeof item !== 'object') {
      return null;
    }

    const rawId = (item.id ?? item.value ?? item.season ?? '').trim();
    if (!rawId) {
      return null;
    }

    const rawLabel = (item.label ?? item.name ?? rawId).trim();
    return {
      id: rawId,
      label: rawLabel || rawId,
      enabled: item.enabled !== false,
      current: item.current === true
    };
  }

  private toSeasonSortKey(season: string): number {
    const match = season.match(/^(\d{4})-(\d{2})$/);
    if (match) {
      const startYear = Number(match[1]);
      const endYear = Number(match[2]);
      return startYear * 100 + endYear;
    }

    const firstYearMatch = season.match(/^(\d{4})/);
    if (firstYearMatch) {
      return Number(firstYearMatch[1]) * 100;
    }

    return 0;
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
    return this._seasons.value.length > 0 &&
      (Date.now() - this._lastLoadTime) < this.CACHE_DURATION;
  }

  private getErrorMessage(error: any): string {
    const backendUrl = this.getBackendBaseUrl();

    if (this.isBackendUnavailableError(error)) {
      return `Backend not available: verify Spring Boot is running on ${backendUrl || 'the configured server'}`;
    }
    if (error?.status === 404) {
      return `Endpoint ${environment.api.config}/seasons not found on backend`;
    }
    if (error?.status === 403) {
      return 'CORS error while loading seasons';
    }
    if (error?.status >= 500) {
      return 'Backend internal server error while loading seasons';
    }

    return error?.message || 'Unknown error loading seasons';
  }

  private isBackendUnavailableError(error: any): boolean {
    const status = Number(error?.status);
    if (status === 0 || status === 502 || status === 503 || status === 504) {
      return true;
    }

    if (status !== 500) {
      return false;
    }

    const payload = this.buildErrorPayload(error);
    const unavailableMarkers = [
      'error occurred while trying to proxy',
      'proxy error',
      'unable to proxy',
      'econnrefused',
      'connection refused',
      'failed to connect',
      'connect error',
      'socket hang up',
      'enotfound',
      'eai_again',
      'etimedout',
      'upstream connect error',
      'actively refused'
    ];

    return unavailableMarkers.some(marker => payload.includes(marker));
  }

  private buildErrorPayload(error: any): string {
    const parts = [
      typeof error?.message === 'string' ? error.message : '',
      typeof error?.statusText === 'string' ? error.statusText : '',
      this.stringifyErrorBody(error?.error)
    ];

    return parts
      .filter(part => part.length > 0)
      .join(' ')
      .toLowerCase();
  }

  private stringifyErrorBody(value: unknown): string {
    if (typeof value === 'string') {
      return value;
    }

    if (value === null || value === undefined) {
      return '';
    }

    if (typeof value === 'object') {
      const obj = value as Record<string, unknown>;
      const candidateParts = [
        typeof obj['message'] === 'string' ? obj['message'] : '',
        typeof obj['error'] === 'string' ? obj['error'] : '',
        typeof obj['detail'] === 'string' ? obj['detail'] : ''
      ].filter(part => part.length > 0);

      let json = '';
      try {
        json = JSON.stringify(value);
      } catch {
        json = '';
      }

      return [...candidateParts, json].filter(part => part.length > 0).join(' ');
    }

    return String(value);
  }
}
