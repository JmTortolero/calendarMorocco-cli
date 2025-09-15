package com.jmtortolero.calendarmorocco.config;

import com.jmtortolero.calendarmorocco.model.CalendarEvent;
import com.jmtortolero.calendarmorocco.repository.CalendarEventRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;

@Component
public class DataInitializer implements CommandLineRunner {
    
    @Autowired
    private CalendarEventRepository eventRepository;
    
    @Override
    public void run(String... args) throws Exception {
        // Add some sample Moroccan calendar events
        CalendarEvent ramadan = new CalendarEvent(
            "Ramadan",
            "Holy month of fasting for Muslims",
            LocalDateTime.of(2024, 3, 11, 0, 0),
            LocalDateTime.of(2024, 4, 9, 23, 59),
            "Morocco",
            CalendarEvent.EventType.RELIGIOUS
        );
        
        CalendarEvent independenceDay = new CalendarEvent(
            "Independence Day",
            "Morocco Independence Day celebration",
            LocalDateTime.of(2024, 11, 18, 9, 0),
            LocalDateTime.of(2024, 11, 18, 18, 0),
            "Rabat, Morocco",
            CalendarEvent.EventType.CULTURAL
        );
        
        CalendarEvent newYear = new CalendarEvent(
            "New Year",
            "Celebration of the new year",
            LocalDateTime.of(2024, 1, 1, 0, 0),
            LocalDateTime.of(2024, 1, 1, 23, 59),
            "Morocco",
            CalendarEvent.EventType.HOLIDAY
        );
        
        CalendarEvent workMeeting = new CalendarEvent(
            "Team Meeting",
            "Weekly team synchronization meeting",
            LocalDateTime.of(2024, 1, 15, 10, 0),
            LocalDateTime.of(2024, 1, 15, 11, 0),
            "Office, Casablanca",
            CalendarEvent.EventType.WORK
        );
        
        eventRepository.save(ramadan);
        eventRepository.save(independenceDay);
        eventRepository.save(newYear);
        eventRepository.save(workMeeting);
        
        System.out.println("Sample data initialized successfully!");
    }
}