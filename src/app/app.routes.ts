import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./components/generateCalendar/generateCalendar').then(m => m.GenerateCalendar),
    title: 'Calendar Generation - Morocco Football Federation'
  },
  {
    path: 'properties',
    loadComponent: () => import('./components/propertiesManager/propertiesManager').then(m => m.PropertiesManager),
    title: 'Properties Manager - Morocco Football Federation'
  },
  {
    path: 'properties-editor',
    loadComponent: () => import('./components/propertiesEditor/propertiesEditor').then(m => m.PropertiesEditor),
    title: 'Properties Editor - Morocco Football Federation'
  },
  {
    path: '**',
    redirectTo: '',
    pathMatch: 'full'
  }
];
