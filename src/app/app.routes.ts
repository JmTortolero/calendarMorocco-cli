import { Routes } from '@angular/router';
import { MonitorComponent } from './features/monitor/monitor.component';
import { CalendarUploadComponent } from './features/calendar/calendar-upload.component';

export const routes: Routes = [
  { path: '', component: CalendarUploadComponent },
  { path: 'monitor', component: MonitorComponent }
];
