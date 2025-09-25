import { ApplicationConfig } from '@angular/core';
import { provideRouter, withEnabledBlockingInitialNavigation, withInMemoryScrolling, withRouterConfig } from '@angular/router';
import { routes } from './app.routes';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';

export const appConfig: ApplicationConfig = {
  providers: [
    // Angular 20 Best Practice: Enhanced router configuration
    provideRouter(
      routes,
      withEnabledBlockingInitialNavigation(), // Prevent flickering on initial load
      withInMemoryScrolling({
        scrollPositionRestoration: 'top', // Scroll to top on route change
        anchorScrolling: 'enabled' // Enable anchor scrolling
      }),
      withRouterConfig({
        onSameUrlNavigation: 'reload' // Allow reloading same route
      })
    ),
    // Angular 20 Best Practice: Enhanced HTTP client
    provideHttpClient(
      withInterceptorsFromDi() // Support for legacy HTTP interceptors if needed
    )
  ]
};
