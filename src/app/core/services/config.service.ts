import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { getAppConfig } from '../config/app.config';

export interface ConfigOption {
  labelKey: string;
  value: string;
}

export interface ConfigResponse {
  configOptions: ConfigOption[];
}

@Injectable({
  providedIn: 'root'
})
export class ConfigService {
  private readonly http = inject(HttpClient);

  // Reactive state for configuration options
  private readonly _configOptions = new BehaviorSubject<ConfigOption[]>([]);
  private readonly _loading = new BehaviorSubject<boolean>(false);
  private readonly _error = new BehaviorSubject<string | null>(null);

  // Public observables
  readonly configOptions$ = this._configOptions.asObservable();
  readonly loading$ = this._loading.asObservable();
  readonly error$ = this._error.asObservable();

  // Options cache
  private _lastLoadTime: number = 0;
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  constructor() {
     this.loadConfigOptions();
  }

  /**
   * Loads configuration options from backend
   * @param forceReload - Force reload ignoring cache
   */
  async loadConfigOptions(forceReload: boolean = false): Promise<ConfigOption[]> {
    if (!forceReload && this.isCacheValid()) {
      return this._configOptions.value;
    }

    this._loading.next(true);
    this._error.next(null);

    try {
      const apiUrl = this.buildApiUrl('/options');
      console.log('🔄 ConfigService: Loading options from backend:', apiUrl);

     const response = await firstValueFrom(this.http.get<ConfigResponse>(apiUrl));
     console.log('🔄 response:', response);
     console.log('🔄 response:configOptions', response.configOptions);
     if (response?.configOptions && Array.isArray(response.configOptions)) {
       this._configOptions.next(response.configOptions);
       this._lastLoadTime = Date.now();

       console.log('✅ ConfigService: Options loaded successfully:', {
         count: response.configOptions.length,
       });

       return response.configOptions;
     } else if (Array.isArray(response)) {
       // If backend returns a direct array, also accept it
       this._configOptions.next(response);
       this._lastLoadTime = Date.now();

       console.log('✅ ConfigService: Options loaded successfully (array):', {
         count: response.length,
       });

       return response;
     } else {
       throw new Error('Invalid backend response: missing configOptions array');
     }
    } catch (backendError) {
      console.error('❌ ConfigService: Error loading from backend:', backendError);
      console.log('🚫 NO FALLBACKS - Backend direct only');

      const errorMessage = this.getErrorMessage(backendError);
      this._error.next(errorMessage);

      // ALWAYS maintain empty array if backend is not available
      this._configOptions.next([]);
      throw backendError;

    } finally {
      this._loading.next(false);
    }
  }



  /**
   * Gets current options from cache
   */
  getCurrentOptions(): ConfigOption[] {
    return this._configOptions.value;
  }

  /**
   * Verifies if a specific option exists
   */
  hasOption(value: string): boolean {
    return this._configOptions.value.some(option => option.value === value);
  }

  /**
   * Gets a specific option by its value
   */
  getOption(value: string): ConfigOption | undefined {
    return this._configOptions.value.find(option => option.value === value);
  }

  /**
   * Refreshes options forcing a reload
   */
  async refresh(): Promise<void> {
    await this.loadConfigOptions(true);
  }

  /**
   * Clears the service state
   */
  clear(): void {
    this._configOptions.next([]);
    this._error.next(null);
    this._loading.next(false);
    this._lastLoadTime = 0;
  }

  // Private helper methods

  /**
   * Builds the complete URL for a specific endpoint
   */
  private buildApiUrl(endpoint: string): string {
    const appConfig = getAppConfig();
    const baseUrl = appConfig.backend.baseUrl;
    const configPath = appConfig.api.endpoints.config;
    const fullUrl = `${baseUrl}${configPath}${endpoint}`;

    console.log('🔗 ConfigService URL Builder:', {
      environment: environment.production ? 'production' : 'development',
      baseUrl,
      configPath,
      endpoint,
      fullUrl,
      configSource: 'app.config.ts'
    });

    return fullUrl;
  }

  /**
   * Gets the backend base URL (for debugging)
   */
  private getBackendBaseUrl(): string {
    return environment.backend.baseUrl;
  }

  private isCacheValid(): boolean {
    return this._configOptions.value.length > 0 &&
           (Date.now() - this._lastLoadTime) < this.CACHE_DURATION;
  }

  private getErrorMessage(error: any): string {
    const backendUrl = this.getBackendBaseUrl();

    if (error?.status === 0) {
      return `Backend not available: Verify that Spring Boot is running on ${backendUrl || 'the configured server'}`;
    }
    if (error?.status === 404) {
      return `Endpoint ${environment.api.config}/options not found on backend`;
    }
    if (error?.status === 403) {
      return 'CORS Error: Configure CORS on Spring Boot backend to allow requests from frontend';
    }
    if (error?.status >= 500) {
      return 'Backend internal server error';
    }
    return error?.message || 'Unknown error loading configuration';
  }
}
