package com.igknight.gateway.filter;

import com.igknight.gateway.security.JwtUtil;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.cloud.gateway.filter.GlobalFilter;
import org.springframework.core.Ordered;
import org.springframework.core.io.buffer.DataBuffer;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.http.server.reactive.ServerHttpResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

import java.nio.charset.StandardCharsets;
import java.util.List;

/**
 * Reactive JWT Authentication Filter for Spring Cloud Gateway
 *
 * This filter validates JWT tokens for protected routes and injects user information
 * into request headers for downstream services.
 */
@Component
public class JwtAuthenticationFilter implements GlobalFilter, Ordered {

    private static final Logger log = LoggerFactory.getLogger(JwtAuthenticationFilter.class);
    private static final String AUTHORIZATION_HEADER = "Authorization";
    private static final String BEARER_PREFIX = "Bearer ";
    private static final String USER_ID_HEADER = "X-User-Id";
    private static final String USERNAME_HEADER = "X-Username";

    private final JwtUtil jwtUtil;

    // Paths that don't require authentication
    private static final List<String> PUBLIC_PATHS = List.of(
            "/api/auth",
            "/auth",
            "/oauth2",
            "/actuator",
            "/dev"  // DEV ONLY - Token generation endpoint for testing
    );

    public JwtAuthenticationFilter(JwtUtil jwtUtil) {
        this.jwtUtil = jwtUtil;
    }

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        ServerHttpRequest request = exchange.getRequest();
        String requestPath = request.getPath().value();

        log.debug("Processing request: {} {}", request.getMethod(), requestPath);

        // CRITICAL: Bypass OPTIONS requests (CORS preflight)
        if ("OPTIONS".equals(request.getMethod().name())) {
            log.debug("OPTIONS request detected, bypassing JWT filter: {}", requestPath);
            return chain.filter(exchange);
        }

        // Skip authentication for public paths
        if (isPublicPath(requestPath)) {
            log.debug("Public path, skipping authentication: {}", requestPath);
            return chain.filter(exchange);
        }

        // Extract Authorization header
        List<String> authHeaders = request.getHeaders().get(AUTHORIZATION_HEADER);

        if (authHeaders == null || authHeaders.isEmpty()) {
            log.warn("Missing Authorization header for path: {}", requestPath);
            return sendUnauthorizedResponse(exchange, "Missing or invalid Authorization header");
        }

        String authHeader = authHeaders.get(0);

        if (!authHeader.startsWith(BEARER_PREFIX)) {
            log.warn("Invalid Authorization header format for path: {}", requestPath);
            return sendUnauthorizedResponse(exchange, "Missing or invalid Authorization header");
        }

        // Extract token (remove "Bearer " prefix)
        String token = authHeader.substring(BEARER_PREFIX.length());

        try {
            // Validate token using JwtUtil
            if (!jwtUtil.validateToken(token)) {
                log.warn("Token validation failed for path: {}", requestPath);
                return sendUnauthorizedResponse(exchange, "Invalid token");
            }

            // Extract user info from token
            Long userId = jwtUtil.getUserIdFromToken(token);
            String username = jwtUtil.getUsernameFromToken(token);

            log.info("JWT validated for user {} ({})", userId, username);

            // Mutate request to add headers and remove Authorization
            ServerHttpRequest mutatedRequest = exchange.getRequest().mutate()
                    .header(USER_ID_HEADER, userId.toString())
                    .header(USERNAME_HEADER, username)
                    .headers(headers -> headers.remove(AUTHORIZATION_HEADER))
                    .build();

            log.debug("Injected headers: X-User-Id={}, X-Username={}", userId, username);

            // Continue filter chain with mutated request
            return chain.filter(exchange.mutate().request(mutatedRequest).build());

        } catch (Exception e) {
            log.error("JWT validation error for path {}: {}", requestPath, e.getMessage());
            return sendUnauthorizedResponse(exchange, "Authentication failed: " + e.getMessage());
        }
    }

    /**
     * Check if the path is public (doesn't require authentication)
     */
    private boolean isPublicPath(String path) {
        return PUBLIC_PATHS.stream().anyMatch(path::startsWith);
    }

    /**
     * Send 401 Unauthorized response reactively
     */
    private Mono<Void> sendUnauthorizedResponse(ServerWebExchange exchange, String message) {
        ServerHttpResponse response = exchange.getResponse();
        response.setStatusCode(HttpStatus.UNAUTHORIZED);
        response.getHeaders().setContentType(MediaType.APPLICATION_JSON);

        String body = String.format(
                "{\"timestamp\":\"%s\",\"status\":401,\"error\":\"Unauthorized\",\"message\":\"%s\"}",
                java.time.Instant.now().toString(),
                message
        );

        DataBuffer buffer = response.bufferFactory().wrap(body.getBytes(StandardCharsets.UTF_8));
        return response.writeWith(Mono.just(buffer));
    }

    @Override
    public int getOrder() {
        return -100; // High priority - execute before routing
    }
}
