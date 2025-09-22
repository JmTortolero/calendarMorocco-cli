import { Routes } from '@angular/router';
import { MonitorComponent } from './features/endpoints/monitor.component';
import { LogsComponent } from './features/logs/logs.component';
import { GenerateCalendarComponent } from './features/generateCalendar/generateCalendar.component';

export const routes: Routes = [
  { path: '', component: GenerateCalendarComponent },
  { path: 'endpoints', component: MonitorComponent },
  { path: 'logs', component: LogsComponent }
];
