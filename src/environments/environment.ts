// Configuración de entorno de desarrollo
export const environment = {
  production: false,
  // Configuración del backend
  backend: {
    protocol: 'http',
    host: 'localhost',
    port: 8080,
    // URL completa se construye dinámicamente
    get baseUrl() {
      return `${this.protocol}://${this.host}:${this.port}`;
    }
  },
  // APIs endpoints
  api: {
    config: '/api/config',
    calendar: '/api/calendar',
    actuator: '/actuator'
  }
};
