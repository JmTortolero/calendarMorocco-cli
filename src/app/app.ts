
import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CalendarUploadComponent } from './calendar-upload.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, CalendarUploadComponent],
  templateUrl: './app.html',
  styleUrl: './app.css',
  standalone: true
})
export class App {
  protected readonly title = signal('calendarMorocco-cli');
}
