package com.jmtortolero.calendarmorocco.repository;

import com.jmtortolero.calendarmorocco.model.CalendarEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface CalendarEventRepository extends JpaRepository<CalendarEvent, Long> {
    
    @Query("SELECT e FROM CalendarEvent e WHERE e.startDate BETWEEN :startDate AND :endDate")
    List<CalendarEvent> findEventsBetweenDates(@Param("startDate") LocalDateTime startDate, 
                                              @Param("endDate") LocalDateTime endDate);
    
    List<CalendarEvent> findByEventType(CalendarEvent.EventType eventType);
    
    @Query("SELECT e FROM CalendarEvent e WHERE LOWER(e.title) LIKE LOWER(CONCAT('%', :keyword, '%')) " +
           "OR LOWER(e.description) LIKE LOWER(CONCAT('%', :keyword, '%'))")
    List<CalendarEvent> findByKeyword(@Param("keyword") String keyword);
}