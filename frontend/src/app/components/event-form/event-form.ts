import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CalendarEvent, EventType } from '../../models/calendar-event';
import { CalendarService } from '../../services/calendar';

@Component({
  selector: 'app-event-form',
  imports: [CommonModule, FormsModule],
  templateUrl: './event-form.html',
  styleUrl: './event-form.css'
})
export class EventFormComponent implements OnInit {
  @Input() event: CalendarEvent | null = null;
  @Output() eventSaved = new EventEmitter<void>();
  @Output() formClosed = new EventEmitter<void>();

  formEvent: CalendarEvent = {
    title: '',
    description: '',
    startDate: '',
    endDate: '',
    location: '',
    eventType: EventType.PERSONAL
  };

  eventTypes = Object.values(EventType);
  isEditing: boolean = false;

  constructor(private calendarService: CalendarService) {}

  ngOnInit(): void {
    if (this.event) {
      this.isEditing = true;
      this.formEvent = { ...this.event };
      // Convert dates to the format required by datetime-local inputs
      this.formEvent.startDate = this.formatDateForInput(this.event.startDate);
      this.formEvent.endDate = this.formatDateForInput(this.event.endDate);
    } else {
      this.isEditing = false;
      // Set default dates
      const now = new Date();
      const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);
      this.formEvent.startDate = this.formatDateForInput(now.toISOString());
      this.formEvent.endDate = this.formatDateForInput(oneHourLater.toISOString());
    }
  }

  formatDateForInput(dateString: string): string {
    const date = new Date(dateString);
    return date.toISOString().slice(0, 16);
  }

  onSubmit(): void {
    if (this.isValid()) {
      // Convert dates back to ISO format
      const eventToSave = {
        ...this.formEvent,
        startDate: new Date(this.formEvent.startDate).toISOString(),
        endDate: new Date(this.formEvent.endDate).toISOString()
      };

      if (this.isEditing && this.event?.id) {
        this.calendarService.updateEvent(this.event.id, eventToSave).subscribe(
          () => this.eventSaved.emit(),
          error => console.error('Error updating event:', error)
        );
      } else {
        this.calendarService.createEvent(eventToSave).subscribe(
          () => this.eventSaved.emit(),
          error => console.error('Error creating event:', error)
        );
      }
    }
  }

  onCancel(): void {
    this.formClosed.emit();
  }

  isValid(): boolean {
    return !!(
      this.formEvent.title.trim() &&
      this.formEvent.startDate &&
      this.formEvent.endDate &&
      new Date(this.formEvent.startDate) < new Date(this.formEvent.endDate)
    );
  }
}
