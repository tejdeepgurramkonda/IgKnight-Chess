package com.igknight.auth.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * Web MVC Configuration for Auth Service
 *
 * Ensures that /api/auth endpoints are properly routed to controllers
 * and not treated as static resources.
 *
 * Static resource handling is disabled via application.properties:
 * - spring.web.resources.add-mappings=false
 * - spring.mvc.throw-exception-if-no-handler-found=true
 */
@Configuration
public class WebMvcConfig implements WebMvcConfigurer {
    // Configuration is handled via application.properties
    // This class is kept for future MVC customizations
}
