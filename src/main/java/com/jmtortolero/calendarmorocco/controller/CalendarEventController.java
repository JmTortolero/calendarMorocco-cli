package com.jmtortolero.calendarmorocco.controller;

import com.jmtortolero.calendarmorocco.model.CalendarEvent;
import com.jmtortolero.calendarmorocco.repository.CalendarEventRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/events")
@CrossOrigin(origins = "http://localhost:4200")
public class CalendarEventController {
    
    @Autowired
    private CalendarEventRepository eventRepository;
    
    @GetMapping
    public List<CalendarEvent> getAllEvents() {
        return eventRepository.findAll();
    }
    
    @GetMapping("/{id}")
    public ResponseEntity<CalendarEvent> getEventById(@PathVariable Long id) {
        Optional<CalendarEvent> event = eventRepository.findById(id);
        return event.map(ResponseEntity::ok)
                   .orElse(ResponseEntity.notFound().build());
    }
    
    @PostMapping
    public ResponseEntity<CalendarEvent> createEvent(@RequestBody CalendarEvent event) {
        try {
            CalendarEvent savedEvent = eventRepository.save(event);
            return ResponseEntity.status(HttpStatus.CREATED).body(savedEvent);
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }
    
    @PutMapping("/{id}")
    public ResponseEntity<CalendarEvent> updateEvent(@PathVariable Long id, @RequestBody CalendarEvent eventDetails) {
        Optional<CalendarEvent> optionalEvent = eventRepository.findById(id);
        
        if (optionalEvent.isPresent()) {
            CalendarEvent event = optionalEvent.get();
            event.setTitle(eventDetails.getTitle());
            event.setDescription(eventDetails.getDescription());
            event.setStartDate(eventDetails.getStartDate());
            event.setEndDate(eventDetails.getEndDate());
            event.setLocation(eventDetails.getLocation());
            event.setEventType(eventDetails.getEventType());
            
            CalendarEvent updatedEvent = eventRepository.save(event);
            return ResponseEntity.ok(updatedEvent);
        } else {
            return ResponseEntity.notFound().build();
        }
    }
    
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteEvent(@PathVariable Long id) {
        if (eventRepository.existsById(id)) {
            eventRepository.deleteById(id);
            return ResponseEntity.noContent().build();
        } else {
            return ResponseEntity.notFound().build();
        }
    }
    
    @GetMapping("/search")
    public List<CalendarEvent> searchEvents(@RequestParam String keyword) {
        return eventRepository.findByKeyword(keyword);
    }
    
    @GetMapping("/date-range")
    public List<CalendarEvent> getEventsByDateRange(
            @RequestParam String startDate,
            @RequestParam String endDate) {
        LocalDateTime start = LocalDateTime.parse(startDate);
        LocalDateTime end = LocalDateTime.parse(endDate);
        return eventRepository.findEventsBetweenDates(start, end);
    }
    
    @GetMapping("/type/{eventType}")
    public List<CalendarEvent> getEventsByType(@PathVariable CalendarEvent.EventType eventType) {
        return eventRepository.findByEventType(eventType);
    }
}