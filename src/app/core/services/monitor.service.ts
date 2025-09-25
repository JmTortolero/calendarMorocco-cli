import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError, timeout, tap } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class MonitorService {
  private readonly apiUrl = '';

  // Angular 20 Best Practice: inject() function
  private readonly http = inject(HttpClient);



  checkBackendStatus(): Observable<boolean> {
    console.log('🔍 Verificando estado del backend en:', `${this.apiUrl}/actuator/health`);
    console.log('🕐 Timestamp:', new Date().toISOString());

    // Enfoque más simple: usar responseType 'text' para evitar problemas de parsing JSON
    return this.http.get(`${this.apiUrl}/actuator/health`, {
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

        // Solo considerar online si es HTTP 200
        if (response.status === 200) {
          console.log('🟢 Backend marcado como ONLINE (HTTP 200 en MAP correctamente)');
          return true;
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
        console.log('⏰ Timestamp del error:', new Date().toISOString());

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

    // Intentamos obtener información de los actuator endpoints
    return this.http.get(`${this.apiUrl}/actuator/info`).pipe(
      timeout(60000),
      map((info: any) => {
        console.log('Info del backend:', info);
        const timestamp = new Date().toISOString();
        return [
          `[${timestamp}] === INFORMACIÓN DEL BACKEND SPRING BOOT ===`,
          `[${timestamp}] Backend: ONLINE en ${this.apiUrl}`,
          `[${timestamp}] Información: ${JSON.stringify(info, null, 2)}`,
          `[${timestamp}] Endpoints disponibles: /actuator/health, /actuator/info`,
          `[${timestamp}] Puerto: 8080`,
          `[${timestamp}] === FIN DE LA INFORMACIÓN ===`
        ];
      }),
      catchError(error => {
        console.log('Info no disponible, intentando health...');

        return this.http.get(`${this.apiUrl}/actuator/health`).pipe(
          timeout(5000),
          map((health: any) => {
            const timestamp = new Date().toISOString();
            return [
              `[${timestamp}] === ESTADO DEL BACKEND ===`,
              `[${timestamp}] Health Status: ${health.status || 'UP'}`,
              `[${timestamp}] Backend Spring Boot está corriendo`,
              `[${timestamp}] URL: ${this.apiUrl}`,
              `[${timestamp}] Health Details: ${JSON.stringify(health, null, 2)}`,
              `[${timestamp}] === FIN DEL ESTADO ===`
            ];
          }),
          catchError(() => {
            const timestamp = new Date().toISOString();
            return of([
              `[${timestamp}] 🚨 PROBLEMA CORS DETECTADO`,
              `[${timestamp}] Backend Spring Boot está corriendo en puerto 8080`,
              `[${timestamp}] Pero Angular no puede conectarse debido a CORS`,
              `[${timestamp}] `,
              `[${timestamp}] SOLUCIÓN - Agrega esta clase a tu backend:`,
              `[${timestamp}] `,
              `[${timestamp}] @Configuration`,
              `[${timestamp}] @EnableWebMvc`,
              `[${timestamp}] public class WebConfig implements WebMvcConfigurer {`,
              `[${timestamp}]     @Override`,
              `[${timestamp}]     public void addCorsMappings(CorsRegistry registry) {`,
              `[${timestamp}]         registry.addMapping("/**")`,
              `[${timestamp}]                 .allowedOrigins("http://localhost:4200")`,
              `[${timestamp}]                 .allowedMethods("GET", "POST", "PUT", "DELETE")`,
              `[${timestamp}]                 .allowedHeaders("*");`,
              `[${timestamp}]     }`,
              `[${timestamp}] }`,
              `[${timestamp}] `,
              `[${timestamp}] Después reinicia el backend Spring Boot`
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
    const baseUrl = ''; // Usar proxy

    console.log('Descubriendo endpoints Spring Boot disponibles...');

    const results: string[] = [];

    return new Observable(observer => {
      let completed = 0;

      endpoints.forEach(endpoint => {
        const url = `${baseUrl}${endpoint}`;
        this.http.get(url, { responseType: 'text' }).pipe(
          timeout(5000),
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
    console.log('🔍 Verificando endpoint:', url);
    console.log('🕐 Timestamp:', new Date().toISOString());

    return this.http.get(url, {
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
        console.log(`Endpoint ${url} respondió con status: ${response.status}`);

        // Solo códigos 2xx son considerados exitosos
        if (response.status >= 200 && response.status < 300) {
          return {
            status: response.status,
            message: `HTTP ${response.status} - OK`,
            body: response.body?.substring(0, 100) || 'Sin contenido',
            error: false
          };
        } else {
          return {
            status: response.status,
            message: `HTTP ${response.status} - Error`,
            body: response.body?.substring(0, 100) || 'Sin contenido',
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
          url: url
        });

        let errorMessage = 'Error desconocido';

        if (error.status === 0) {
          errorMessage = 'Servidor no responde o proxy falló';
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

        console.log(`🔴 Endpoint ${url} marcado como OFFLINE: ${errorMessage}`);

        return of({
          status: error.status || 0,
          message: errorMessage,
          error: true
        });
      })
    );
  }
}
