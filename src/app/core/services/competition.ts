import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { getAppConfig } from '../config/app.config';

export interface CompetitionOption {
  id: string;
  name: string;
  enabled: boolean;
  current: boolean;
  properties: string;
}

type CompetitionApiItem =
  | string
  | {
      id?: string;
      value?: string;
      competition?: string;
      code?: string;
      key?: string;
      name?: string;
      label?: string;
      title?: string;
      enabled?: boolean;
      current?: boolean;
      properties?: unknown;
      metadata?: unknown;
    };

type CompetitionsResponse =
  | CompetitionApiItem[]
  | {
      competitions?: CompetitionApiItem[];
      items?: CompetitionApiItem[];
      values?: CompetitionApiItem[];
    };

@Injectable({
  providedIn: 'root',
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

  async loadCompetitions(forceReload: boolean = false): Promise<CompetitionOption[]> {
    if (!forceReload && this.isCacheValid()) {
      return this._competitions.value;
    }

    this._loading.next(true);
    this._error.next(null);

    try {
      const apiUrl = this.buildApiUrl('/competitions');
      const response = await firstValueFrom(this.http.get<CompetitionsResponse>(apiUrl));
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

  async refresh(): Promise<void> {
    await this.loadCompetitions(true);
  }

  getCurrentCompetitions(): CompetitionOption[] {
    return this._competitions.value;
  }

  hasCompetitionId(competitionId: string): boolean {
    return this._competitions.value.some(
      (competition) => competition.enabled && competition.id === competitionId,
    );
  }

  getPreferredCompetition(fallbackCompetitionId?: string): string {
    const enabledCompetitions = this._competitions.value.filter((competition) => competition.enabled);
    if (
      fallbackCompetitionId &&
      enabledCompetitions.some((competition) => competition.id === fallbackCompetitionId)
    ) {
      return fallbackCompetitionId;
    }

    const currentCompetition = enabledCompetitions.find((competition) => competition.current);
    if (currentCompetition) {
      return currentCompetition.id;
    }

    return enabledCompetitions[0]?.id ?? '';
  }

  clear(): void {
    this._competitions.next([]);
    this._error.next(null);
    this._loading.next(false);
    this._lastLoadTime = 0;
  }

  private normalizeResponse(response: CompetitionsResponse): CompetitionOption[] {
    const source = this.extractSource(response);
    const normalized = source
      .map((item) => this.normalizeItem(item))
      .filter((item): item is CompetitionOption => item !== null)
      .filter((item) => item.enabled);

    const deduped = new Map<string, CompetitionOption>();
    for (const competition of normalized) {
      if (!deduped.has(competition.id)) {
        deduped.set(competition.id, competition);
      }
    }

    return Array.from(deduped.values()).sort((a, b) => {
      if (a.current !== b.current) {
        return a.current ? -1 : 1;
      }
      return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
    });
  }

  private extractSource(response: CompetitionsResponse): CompetitionApiItem[] {
    if (Array.isArray(response)) {
      return response;
    }

    if (response && Array.isArray(response.competitions)) {
      return response.competitions;
    }

    if (response && Array.isArray(response.items)) {
      return response.items;
    }

    if (response && Array.isArray(response.values)) {
      return response.values;
    }

    return [];
  }

  private normalizeItem(item: CompetitionApiItem): CompetitionOption | null {
    if (typeof item === 'string') {
      const id = item.trim();
      if (!id) {
        return null;
      }

      return {
        id,
        name: id,
        enabled: true,
        current: false,
        properties: id,
      };
    }

    if (!item || typeof item !== 'object') {
      return null;
    }

    const rawId = (
      item.id ??
      item.value ??
      item.competition ??
      item.code ??
      item.key ??
      ''
    ).trim();
    if (!rawId) {
      return null;
    }

    const rawName = (item.name ?? item.label ?? item.title ?? rawId).trim();
    const propertiesPayload = this.normalizeProperties(item.properties ?? item.metadata);
    const fallbackProperties = `${rawId} ${rawName}`.trim();

    return {
      id: rawId,
      name: rawName || rawId,
      enabled: item.enabled !== false,
      current: item.current === true,
      properties: propertiesPayload || fallbackProperties,
    };
  }

  private normalizeProperties(value: unknown): string {
    if (typeof value === 'string') {
      return value.trim();
    }

    if (value === null || value === undefined) {
      return '';
    }

    if (typeof value === 'object') {
      const objectValue = value as Record<string, unknown>;
      const candidateParts = [
        this.readString(objectValue['name']),
        this.readString(objectValue['label']),
        this.readString(objectValue['division']),
        this.readString(objectValue['category']),
        this.readString(objectValue['type']),
        this.readString(objectValue['level']),
      ].filter((part) => part.length > 0);

      if (candidateParts.length > 0) {
        return candidateParts.join(' ').trim();
      }

      try {
        return JSON.stringify(value);
      } catch {
        return '';
      }
    }

    return String(value).trim();
  }

  private readString(value: unknown): string {
    return typeof value === 'string' ? value.trim() : '';
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
    return this._competitions.value.length > 0 && Date.now() - this._lastLoadTime < this.CACHE_DURATION;
  }

  private getErrorMessage(error: any): string {
    const backendUrl = this.getBackendBaseUrl();

    if (this.isBackendUnavailableError(error)) {
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
      'actively refused',
    ];

    return unavailableMarkers.some((marker) => payload.includes(marker));
  }

  private buildErrorPayload(error: any): string {
    const parts = [
      typeof error?.message === 'string' ? error.message : '',
      typeof error?.statusText === 'string' ? error.statusText : '',
      this.stringifyErrorBody(error?.error),
    ];

    return parts
      .filter((part) => part.length > 0)
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
        typeof obj['detail'] === 'string' ? obj['detail'] : '',
      ].filter((part) => part.length > 0);

      let json = '';
      try {
        json = JSON.stringify(value);
      } catch {
        json = '';
      }

      return [...candidateParts, json].filter((part) => part.length > 0).join(' ');
    }

    return String(value);
  }
}
