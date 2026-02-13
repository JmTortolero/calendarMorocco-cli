import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class BackendStatus {
  private readonly unavailableMarkers = [
    'backend not available',
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

  private readonly _isUnavailable = signal(false);
  readonly isUnavailable = this._isUnavailable.asReadonly();

  markUnavailable(): void {
    this._isUnavailable.set(true);
  }

  markAvailable(): void {
    this._isUnavailable.set(false);
  }

  isBackendUnavailableError(error: unknown): boolean {
    const status = Number((error as any)?.status);
    if (status === 0 || status === 502 || status === 503 || status === 504) {
      return true;
    }

    if (status >= 500) {
      const payload = this.buildErrorPayload(error);
      if (this.unavailableMarkers.some((marker) => payload.includes(marker))) {
        return true;
      }
      return true;
    }

    return this.isBackendUnavailableMessage(this.extractErrorMessage(error));
  }

  private isBackendUnavailableMessage(message: string | null | undefined): boolean {
    if (!message) {
      return false;
    }

    const normalized = message.toLowerCase();
    return this.unavailableMarkers.some((marker) => normalized.includes(marker));
  }

  private extractErrorMessage(error: unknown): string {
    const typedError = error as any;
    if (typeof typedError?.error?.message === 'string') {
      return typedError.error.message;
    }
    if (typeof typedError?.message === 'string') {
      return typedError.message;
    }
    return '';
  }

  private buildErrorPayload(error: unknown): string {
    const typedError = error as any;
    const parts = [
      typeof typedError?.message === 'string' ? typedError.message : '',
      typeof typedError?.statusText === 'string' ? typedError.statusText : '',
      this.stringifyErrorBody(typedError?.error),
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
