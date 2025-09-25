import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./features/generateCalendar/generateCalendar.component').then(m => m.GenerateCalendarComponent),
    title: 'Calendar Generation - Morocco Football Federation'
  },
  {
    path: 'endpoints',
    loadComponent: () => import('./features/endpoints/endpoints.component').then(m => m.EndpointsComponent),
    title: 'Endpoints Monitor - Morocco Football Federation'
  },
  {
    path: 'logs',
    loadComponent: () => import('./features/logs/logs.component').then(m => m.LogsComponent),
    title: 'System Logs - Morocco Football Federation'
  },
  {
    path: '**',
    redirectTo: '',
    pathMatch: 'full'
  }
];
