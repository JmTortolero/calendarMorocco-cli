export interface CalendarEvent {
  id?: number;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  location: string;
  eventType: EventType;
}

export enum EventType {
  PERSONAL = 'PERSONAL',
  WORK = 'WORK',
  HOLIDAY = 'HOLIDAY',
  RELIGIOUS = 'RELIGIOUS',
  CULTURAL = 'CULTURAL'
}
