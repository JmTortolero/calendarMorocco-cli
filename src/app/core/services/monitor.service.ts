import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError, timeout } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class MonitorService {
  private apiUrl = 'http://localhost:8080';

  constructor(private http: HttpClient) {}

  checkBackendStatus(): Observable<boolean> {
    console.log('Verificando estado del backend en:', `${this.apiUrl}/actuator/health`);

    // Spring Boot Actuator health endpoint
    return this.http.get(`${this.apiUrl}/actuator/health`).pipe(
      timeout(10000),
      map(response => {
        console.log('Backend health respondió:', response);
        return true;
      }),
      catchError(error => {
        console.error('Error CORS o conexión:', error);
        console.log('Detalles del error:', {
          message: error.message,
          status: error.status,
          url: error.url
        });

        if (error.status === 0) {
          console.log('🚨 ERROR CORS DETECTADO:');
          console.log('Tu backend Spring Boot necesita configuración CORS');
          console.log('Agrega esta configuración a tu backend:');
          console.log(`
@Configuration
@EnableWebMvc
public class WebConfig implements WebMvcConfigurer {
    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/**")
                .allowedOrigins("http://localhost:4200")
                .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS")
                .allowedHeaders("*")
                .allowCredentials(true);
    }
}`);
        }

        console.log('Intentando endpoint info...');

        // Si /health falla, intentamos /info
        return this.http.get(`${this.apiUrl}/actuator/info`).pipe(
          timeout(5000),
          map(response => {
            console.log('Endpoint /actuator/info respondió:', response);
            return true;
          }),
          catchError(infoError => {
            console.log('Intentando endpoint raíz...');

            // Si los actuator fallan, intentamos la raíz
            return this.http.get(this.apiUrl, { responseType: 'text' }).pipe(
              timeout(5000),
              map(response => {
                console.log('Endpoint raíz respondió, Spring Boot está corriendo');
                return true;
              }),
              catchError(rootError => {
                console.error('Backend Spring Boot offline:', {
                  healthError: error,
                  infoError: infoError,
                  rootError: rootError
                });
                console.log('Asegúrate de que el backend Spring Boot esté corriendo en puerto 8080');
                return of(false);
              })
            );
          })
        );
      })
    );
  }

  getLogs(): Observable<string[]> {
    console.log('Obteniendo información del backend Spring Boot...');

    // Intentamos obtener información de los actuator endpoints
    return this.http.get(`${this.apiUrl}/actuator/info`).pipe(
      timeout(10000),
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
    const baseUrl = 'http://localhost:8080';

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
    console.log('Verificando endpoint:', url);

    return this.http.get(url, {
      responseType: 'text',
      observe: 'response'
    }).pipe(
      timeout(5000),
      map(response => {
        return {
          status: response.status,
          message: `HTTP ${response.status} - OK`,
          body: response.body?.substring(0, 100) || 'Sin contenido'
        };
      }),
      catchError(error => {
        let errorMessage = 'Error desconocido';

        if (error.status === 0) {
          errorMessage = 'CORS o servidor no responde';
        } else if (error.status === 404) {
          errorMessage = 'Endpoint no encontrado (404)';
        } else if (error.status === 500) {
          errorMessage = 'Error interno del servidor (500)';
        } else if (error.status) {
          errorMessage = `HTTP ${error.status}`;
        }

        return of({
          status: error.status || 0,
          message: errorMessage,
          error: true
        });
      })
    );
  }
}
