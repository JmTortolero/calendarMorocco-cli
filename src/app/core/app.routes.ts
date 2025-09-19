import { Routes } from '@angular/router';
import { MonitorComponent } from '../monitor/monitor.component';
import { CalendarUploadComponent } from '../calendar/calendar-upload.component';

export const routes: Routes = [
  { path: '', component: CalendarUploadComponent },
  { path: 'monitor', component: MonitorComponent }
];