package com.morocco.calendar.config;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/config")
@CrossOrigin(origins = {"http://localhost:4200", "http://localhost:4201"})
public class ConfigController {

    @Autowired
    private ConfigService configService;

    @GetMapping("/options")
    public ResponseEntity<ConfigResponse> getConfigOptions() {
        try {
            ConfigResponse response = configService.getConfigOptions();
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            // Fallback con configuración por defecto
            ConfigResponse fallback = configService.getDefaultConfig();
            return ResponseEntity.ok(fallback);
        }
    }
}
