import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError, timeout, tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class MonitorService {
  private readonly http = inject(HttpClient);

  // SOLO URLs directas al backend puerto 8080 - NO usar proxy



  /**
   * Construye URL para endpoints del actuator
   */
  private buildActuatorUrl(endpoint: string): string {
    const baseUrl = environment.backend.baseUrl;
    const actuatorPath = environment.api.actuator;
    const fullUrl = `${baseUrl}${actuatorPath}${endpoint}`;

    console.log('🔗 MonitorService URL Builder:', {
      environment: environment.production ? 'production' : 'development',
      baseUrl,
      actuatorPath,
      endpoint,
      fullUrl
    });

    return fullUrl;
  }

  /**
   * Obtiene la URL base del backend (legacy - para compatibilidad)
   */
  private getBackendUrl(): string {
    return environment.backend.baseUrl;
  }

  checkBackendStatus(): Observable<boolean> {
    const healthUrl = this.buildActuatorUrl('/health');
    console.log('🔍 Verificando estado del backend en:', healthUrl);

    // Usar URL configurada desde environment
    return this.http.get(healthUrl, {
      observe: 'response',
      responseType: 'text', // Cambiar a text para evitar problemas de parsing
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    }).pipe(
      timeout(10000), // Timeout generoso
      tap(response => {
        console.log('🔄 Respuesta recibida - Status:', response.status);
        console.log('🔄 Content-Type:', response.headers.get('content-type'));
        console.log('🔄 Body type:', typeof response.body);
        console.log('🔄 Body preview:', response.body?.substring(0, 100));
      }),
      map(response => {
        console.log('✅ Procesando respuesta en MAP (no en catchError)');
        console.log('📊 Status code:', response.status);

        const body = response.body || '';
        const contentType = response.headers.get('content-type') || '';

        // Detectar falsos HTTP 200 también en checkBackendStatus
        if (response.status === 200) {
          // Si el content-type es HTML cuando esperamos JSON para /actuator/health
          if (contentType.includes('text/html')) {
            console.log('🚨 BACKEND CHECK: HTTP 200 pero content-type es HTML - Falso positivo');
            return false;
          }

          // Intentar validar que es una respuesta legítima de Spring Actuator
          try {
            JSON.parse(body);
            console.log('🟢 Backend marcado como ONLINE (HTTP 200 con JSON válido)', body);
            return true;
          } catch {
            console.log(
              `🔴 catch Backend respondió con status ${response.status}, considerando OFFLINE`
            );
            return false;
          }
        } else {
          console.log(`🔴 Backend respondió con status ${response.status}, considerando OFFLINE`);
          return false;
        }
      }),
      catchError(error => {
        console.error('❌ ERROR en checkBackendStatus:', error);
        console.log('🔍 Detalles completos del error:', {
          message: error.message,
          status: error.status,
          statusText: error.statusText,
          url: error.url,
          name: error.name,
          error: error.error,
          type: typeof error,
          constructor: error.constructor.name
        });

        // NO usar fallbacks al proxy - solo backend directo
        console.log('🚨 Sin fallbacks - Solo backend directo puerto 8080');
        // DIAGNÓSTICO: Si vemos HTTP 200 aquí, aún hay un problema
        if (error.status === 200) {
          console.log('🚨 PROBLEMA PERSISTE: HTTP 200 sigue llegando al catchError');
          console.log('🔍 Con responseType: text, esto no debería pasar');
          console.log('🔍 Error completo:', JSON.stringify(error, null, 2));
          console.log('🔍 Probablemente es un problema con el timeout o el pipeline');
          // Forzar return true ya que sabemos que es HTTP 200
          return of(true);
        }

        // Analizar el tipo de error
        if (error.status === 0) {
          console.log('🚨 ERROR: Sin conexión al backend');
          console.log('💡 Posibles causas:');
          console.log('   - Backend Spring Boot no está corriendo');
          console.log('   - Problema de red');
          console.log('   - Proxy falló al conectar');
        } else if (error.status === 502) {
          console.log('🚨 ERROR 502: Bad Gateway - Proxy no puede conectar al backend');
        } else if (error.status === 503) {
          console.log('🚨 ERROR 503: Service Unavailable - Backend no disponible');
        } else if (error.status === 504) {
          console.log('🚨 ERROR 504: Gateway Timeout - Backend no responde');
        } else {
          console.log(`🚨 ERROR HTTP ${error.status}: ${error.statusText}`);
        }
        console.log('🔴 Backend marcado como OFFLINE - No hay fallbacks');
        console.log('⚠️  Para debugging: verifica que el backend esté corriendo en puerto 8080');
        // NO hacer fallbacks - si falla el health endpoint, es que está offline
        return of(false);
      })
    );
  }

  getLogs(): Observable<string[]> {
    console.log('Obteniendo información del backend Spring Boot...');
    const infoUrl = this.buildActuatorUrl('/info');

    // Usar URL configurada desde environment
    return this.http.get(infoUrl).pipe(
      timeout(60000),
      map((info: any) => {
        console.log('Info del backend:', info);
        const timestamp = new Date().toISOString();
        return [
            ];
      }),
      catchError(error => {
        console.log('Info no disponible, intentando health...');
        const healthUrl = this.buildActuatorUrl('/health');

        return this.http.get(healthUrl).pipe(
          timeout(5000),
          map((health: any) => {
            const timestamp = new Date().toISOString();
            return [
              `[${timestamp}] === ESTADO DEL BACKEND ===`,
              `[${timestamp}] Health Status: ${health.status || 'UP'}`,
              `[${timestamp}] Backend Spring Boot está corriendo`,
              `[${timestamp}] URL: ${healthUrl}`,
              `[${timestamp}] Health Details: ${JSON.stringify(health, null, 2)}`,
              `[${timestamp}] === FIN DEL ESTADO ===`
            ];
          }),
          catchError(() => {
            const timestamp = new Date().toISOString();
            return of([

            ]);
          })
        );
      })
    );
  }

  // Método para probar qué endpoints están disponibles
  discoverEndpoints(): Observable<string[]> {
    const endpoints = [
      '',
      '/actuator',
      '/api/actuator',
      '/actuator/health',
      '/actuator/info',
      '/actuator/mappings',
      '/api',
      '/error'
    ];
    const baseUrl = this.getBackendUrl(); // Usar backend directo

    console.log('Descubriendo endpoints Spring Boot disponibles...');

    const results: string[] = [];

    return new Observable(observer => {
      let completed = 0;

      endpoints.forEach(endpoint => {
        const url = `${baseUrl}${endpoint}`;
        this.http.get(url, { responseType: 'text' }).pipe(
          timeout(2000),
          map(() => `✅ ${url} - DISPONIBLE`),
          catchError(error => of(`❌ ${url} - ERROR: ${error.status || 'No responde'}`))
        ).subscribe(result => {
          results.push(result);
          completed++;

          if (completed === endpoints.length) {
            observer.next(results);
            observer.complete();
          }
        });
      });
    });
  }

  // Método para verificar un endpoint específico
  checkSingleEndpoint(url: string): Observable<any> {
    // Si la URL es relativa (no empieza con http), convertirla a absoluta usando el backend
    const finalUrl = url.startsWith('http') ? url : `${this.getBackendUrl()}${url}`;
    console.log('🔍 Verificando endpoint: ', finalUrl);
    return this.http.get(finalUrl, {
      responseType: 'text',
      observe: 'response',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    }).pipe(
      timeout(3000), // Reducir timeout
      map(response => {
        console.log(`Endpoint ${finalUrl} respondió con status: ${response.status}`);
        const body = response.body || '';
        const contentType = response.headers.get('content-type') || '';

        console.log(`Content-Type: ${contentType}`);
        console.log(`Body preview: ${body.substring(0, 200)}`);

        // DETECCIÓN DE FALSOS HTTP 200 DEL PROXY ANGULAR
        // Si recibimos HTTP 200 pero el contenido es HTML con errores, es un falso positivo
        if (response.status === 200) {
          // Si el content-type es text/html cuando esperamos JSON, es sospechoso
          if (contentType.includes('text/html')) {
            console.log('🚨 PROXY ERROR DETECTADO: HTTP 200 pero content-type es HTML');

            // Buscar indicadores de páginas de error comunes
            const bodyLower = body.toLowerCase();
            const errorIndicators = [
              'cannot get',
              'error occurred',
              'proxy error',
              'connection refused',
              'econnrefused',
              'bad gateway',
              'service unavailable',
              '404',
              '500',
              '502',
              '503',
              'nginx',
              'apache'
            ];

            const hasErrorIndicator = errorIndicators.some(indicator =>
              bodyLower.includes(indicator)
            );

            if (hasErrorIndicator) {
              console.log('🔴 FALSE HTTP 200 DETECTADO - Marcando como error');
              return {
                status: 502, // Simular Bad Gateway ya que el proxy falló
                message: 'Error: Proxy devolvió página de error HTML',
                body: body.substring(0, 100),
                error: true
              };
            }
          }

          // Si esperamos JSON para endpoints específicos
          if (url.includes('/actuator/') || url.includes('/api/')) {
            // Intentar parsear como JSON
            try {
              JSON.parse(body);
              // Si se parsea correctamente, es válido
              console.log('✅ HTTP 200 válido con JSON');
            } catch {
              // Si no se puede parsear como JSON, probablemente es HTML de error
              console.log('🔴 HTTP 200 inválido - No es JSON válido');
              return {
                status: 502,
                message: 'Error: Respuesta no es JSON válido',
                body: body.substring(0, 100),
                error: true
              };
            }
          }

          // Si llegamos aquí, es un HTTP 200 legítimo
          return {
            status: response.status,
            message: `HTTP ${response.status} - OK`,
            body: body.substring(0, 100),
            error: false
          };
        } else {
          // Status codes que no son 2xx
          return {
            status: response.status,
            message: `HTTP ${response.status} - Error`,
            body: body.substring(0, 100),
            error: true
          };
        }
      }),
      catchError(error => {
        console.error('❌ ERROR en checkSingleEndpoint:', error);
        console.log('🔍 Error details:', {
          status: error.status,
          statusText: error.statusText,
          message: error.message,
          url: finalUrl
        });

        let errorMessage = 'Error desconocido';

        if (error.status === 0) {
          errorMessage = 'Servidor no responde o error de red';
        } else if (error.status === 403) {
          errorMessage = 'Error CORS - Backend rechaza solicitud cross-origin';
        } else if (error.status === 502) {
          errorMessage = 'Bad Gateway - Proxy no puede conectar';
        } else if (error.status === 503) {
          errorMessage = 'Service Unavailable - Backend offline';
        } else if (error.status === 504) {
          errorMessage = 'Gateway Timeout - Backend no responde';
        } else if (error.status === 404) {
          errorMessage = 'Endpoint no encontrado (404)';
        } else if (error.status === 500) {
          errorMessage = 'Error interno del servidor (500)';
        } else if (error.status) {
          errorMessage = `HTTP ${error.status} - ${error.statusText}`;
        }

        console.log(`🔴 Endpoint ${finalUrl} marcado como OFFLINE: ${errorMessage}`);

        return of({
          status: error.status || 0,
          message: errorMessage,
          error: true
        });
      })
    );
  }
}
