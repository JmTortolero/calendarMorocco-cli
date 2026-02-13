import { Injectable, inject } from '@angular/core';
import {
  HttpEvent,
  HttpHandler,
  HttpInterceptor,
  HttpRequest,
  HttpResponse,
} from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { BackendStatus } from '../services/backend-status';

@Injectable()
export class BackendStatusInterceptor implements HttpInterceptor {
  private readonly backendStatus = inject(BackendStatus);

  intercept(req: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    if (!this.isBackendTrackedRequest(req.url)) {
      return next.handle(req);
    }

    return next.handle(req).pipe(
      tap({
        next: (event) => {
          if (event instanceof HttpResponse) {
            this.backendStatus.markAvailable();
          }
        },
        error: (error: unknown) => {
          if (this.backendStatus.isBackendUnavailableError(error)) {
            this.backendStatus.markUnavailable();
          }
        },
      }),
    );
  }

  private isBackendTrackedRequest(url: string): boolean {
    const normalizedUrl = (url ?? '').toLowerCase();
    return normalizedUrl.includes('/api/') || normalizedUrl.includes('/actuator/');
  }
}
