import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./components/generateCalendar/generateCalendar').then(m => m.GenerateCalendar),
    title: 'Calendar Generation - Morocco Football Federation'
  },
  {
    path: 'excel-manager',
    loadComponent: () => import('./components/excelManager/excelManager').then(m => m.ExcelManager),
    title: 'Excel Manager - Morocco Football Federation'
  },
  {
    path: 'properties',
    redirectTo: 'excel-manager',
    pathMatch: 'full'
  },
  {
    path: '**',
    redirectTo: '',
    pathMatch: 'full'
  }
];
