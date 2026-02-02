package com.igknight.realtime.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Health check controller
 */
@RestController
@RequestMapping("/health")
public class HealthController {

    @GetMapping
    public String health() {
        return "Realtime Game Service is running on port 8087";
    }
}
