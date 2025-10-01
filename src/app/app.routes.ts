import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./components/generateCalendar/generateCalendar').then(m => m.GenerateCalendar),
    title: 'Calendar Generation - Morocco Football Federation'
  },
  {
    path: '**',
    redirectTo: '',
    pathMatch: 'full'
  }
];
