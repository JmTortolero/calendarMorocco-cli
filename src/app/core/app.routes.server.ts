import { Routes } from '@angular/router';
import { ServerRoute, RenderMode } from '@angular/ssr';
import { routes } from './app.routes';

export const serverRoutes: ServerRoute[] = routes.map(route => ({
  path: route.path || '',
  component: route.component,
  renderMode: RenderMode.Server
}));