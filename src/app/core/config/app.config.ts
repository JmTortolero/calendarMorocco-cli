/**
 * Configuración centralizada de la aplicación
 * Permite sobreescribir configuraciones desde variables de entorno
 * o configuraciones dinámicas
 */

import { environment } from '../../../environments/environment';

export interface AppConfig {
  backend: {
    baseUrl: string;
    timeout: number;
    retries: number;
  };
  api: {
    endpoints: {
      config: string;
      calendar: string;
      actuator: string;
    };
  };
  features: {
    enableCORS: boolean;
    enableCache: boolean;
    cacheTimeout: number;
  };
}

/**
 * Configuración por defecto de la aplicación
 */
export const defaultAppConfig: AppConfig = {
  backend: {
    baseUrl: environment.backend.baseUrl,
    timeout: 30000, // 30 segundos
    retries: 3
  },
  api: {
    endpoints: {
      config: environment.api.config,
      calendar: environment.api.calendar,
      actuator: environment.api.actuator
    }
  },
  features: {
    enableCORS: !environment.production, // Solo en desarrollo
    enableCache: true,
    cacheTimeout: 5 * 60 * 1000 // 5 minutos
  }
};

/**
 * Obtiene la configuración actual de la aplicación
 * Permite sobreescribir desde localStorage o variables globales
 */
export function getAppConfig(): AppConfig {
  // Intentar cargar configuración personalizada desde localStorage
  const customConfig = loadCustomConfig();

  // Merge configuración por defecto con la personalizada
  return {
    ...defaultAppConfig,
    ...customConfig,
    backend: {
      ...defaultAppConfig.backend,
      ...customConfig?.backend
    },
    api: {
      endpoints: {
        ...defaultAppConfig.api.endpoints,
        ...customConfig?.api?.endpoints
      }
    },
    features: {
      ...defaultAppConfig.features,
      ...customConfig?.features
    }
  };
}

/**
 * Carga configuración personalizada desde localStorage
 */
function loadCustomConfig(): Partial<AppConfig> | null {
  try {
    const stored = localStorage.getItem('app-config');
    return stored ? JSON.parse(stored) : null;
  } catch (error) {
    console.warn('No se pudo cargar configuración personalizada:', error);
    return null;
  }
}

/**
 * Guarda configuración personalizada en localStorage
 */
export function saveCustomConfig(config: Partial<AppConfig>): void {
  try {
    localStorage.setItem('app-config', JSON.stringify(config));
    console.log('✅ Configuración personalizada guardada');
  } catch (error) {
    console.error('❌ Error guardando configuración:', error);
  }
}

/**
 * Limpia configuración personalizada
 */
export function clearCustomConfig(): void {
  localStorage.removeItem('app-config');
  console.log('🗑️ Configuración personalizada eliminada');
}

/**
 * Permite sobreescribir la URL del backend en tiempo de ejecución
 * Útil para testing o configuraciones dinámicas
 */
export function overrideBackendUrl(newUrl: string): void {
  const currentConfig = getAppConfig();
  const newConfig = {
    ...currentConfig,
    backend: {
      ...currentConfig.backend,
      baseUrl: newUrl
    }
  };
  saveCustomConfig(newConfig);

  // Recargar la página para aplicar cambios
  if (confirm('Se cambiará la URL del backend. ¿Recargar la página?')) {
    window.location.reload();
  }
}
