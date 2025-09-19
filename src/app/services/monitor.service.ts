import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, interval } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class MonitorService {
  private apiUrl = 'https://calendar-moroco.onrender.com/api';

  constructor(private http: HttpClient) {}

  checkBackendStatus(): Observable<boolean> {
    return this.http.get(`${this.apiUrl}/health`).pipe(
      map(() => true),
      catchError(() => [false])
    );
  }

  getLogs(): Observable<string[]> {
    return this.http.get<string[]>(`${this.apiUrl}/logs`);
  }
}