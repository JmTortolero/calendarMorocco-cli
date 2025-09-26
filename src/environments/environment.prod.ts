// Configuración de entorno de producción
export const environment = {
  production: true,
  // En producción, backend está en el mismo servidor (Nginx proxy)
  backend: {
    protocol: 'https',
    host: window.location.hostname, // Dinámico según el dominio
    port: 443, // Puerto estándar HTTPS
    get baseUrl() {
      // En producción, usar URLs relativas (proxy inverso con Nginx)
      return '';
    }
  },
  // APIs endpoints (iguales en todos los entornos)
  api: {
    config: '/api/config',
    calendar: '/api/calendar',
    actuator: '/actuator'
  }
};
