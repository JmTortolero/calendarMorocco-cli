import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CalendarService } from '../../services/calendar';
import { CalendarEvent, EventType } from '../../models/calendar-event';
import { EventFormComponent } from '../event-form/event-form';

@Component({
  selector: 'app-calendar',
  imports: [CommonModule, FormsModule, EventFormComponent],
  templateUrl: './calendar.html',
  styleUrl: './calendar.css'
})
export class CalendarComponent implements OnInit {
  events: CalendarEvent[] = [];
  filteredEvents: CalendarEvent[] = [];
  searchKeyword: string = '';
  selectedEventType: string = '';
  showEventForm: boolean = false;
  editingEvent: CalendarEvent | null = null;
  
  eventTypes = Object.values(EventType);

  constructor(private calendarService: CalendarService) {}

  ngOnInit(): void {
    this.loadEvents();
  }

  loadEvents(): void {
    this.calendarService.getAllEvents().subscribe(
      events => {
        this.events = events;
        this.filteredEvents = events;
      },
      error => console.error('Error loading events:', error)
    );
  }

  searchEvents(): void {
    if (this.searchKeyword.trim()) {
      this.calendarService.searchEvents(this.searchKeyword).subscribe(
        events => this.filteredEvents = events,
        error => console.error('Error searching events:', error)
      );
    } else {
      this.filteredEvents = this.events;
    }
  }

  filterByType(): void {
    if (this.selectedEventType) {
      this.calendarService.getEventsByType(this.selectedEventType).subscribe(
        events => this.filteredEvents = events,
        error => console.error('Error filtering events:', error)
      );
    } else {
      this.filteredEvents = this.events;
    }
  }

  openEventForm(event?: CalendarEvent): void {
    this.editingEvent = event || null;
    this.showEventForm = true;
  }

  closeEventForm(): void {
    this.showEventForm = false;
    this.editingEvent = null;
  }

  onEventSaved(): void {
    this.closeEventForm();
    this.loadEvents();
  }

  deleteEvent(event: CalendarEvent): void {
    if (event.id && confirm('Are you sure you want to delete this event?')) {
      this.calendarService.deleteEvent(event.id).subscribe(
        () => this.loadEvents(),
        error => console.error('Error deleting event:', error)
      );
    }
  }

  formatDateTime(dateTime: string): string {
    return new Date(dateTime).toLocaleString();
  }

  getEventTypeColor(eventType: EventType): string {
    switch (eventType) {
      case EventType.WORK: return '#007bff';
      case EventType.PERSONAL: return '#28a745';
      case EventType.HOLIDAY: return '#dc3545';
      case EventType.RELIGIOUS: return '#6f42c1';
      case EventType.CULTURAL: return '#fd7e14';
      default: return '#6c757d';
    }
  }
}
