// Configuración de entorno de desarrollo
// En dev, el proxy de Angular (proxy.k8s.json o proxy.local.json) redirige /api/* al backend.
// Por eso baseUrl es '' → todas las peticiones son relativas.
export const environment = {
  production: false,
  backend: {
    protocol: 'http',
    host: 'localhost',
    port: 8080,
    // En dev: URLs relativas (el proxy redirige)
    get baseUrl(): string {
      return '';
    }
  },
  api: {
    config: '/api/config',
    calendar: '/api/calendar',
    actuator: '/actuator'
  }
};
