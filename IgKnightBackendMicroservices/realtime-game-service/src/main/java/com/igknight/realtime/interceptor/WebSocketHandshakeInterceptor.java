package com.igknight.realtime.interceptor;

import java.util.List;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.WebSocketHandler;
import org.springframework.web.socket.server.HandshakeInterceptor;

import com.igknight.realtime.security.JwtUtil;

/**
 * WebSocket Handshake Interceptor with JWT Authentication
 * 
 * SECURITY CRITICAL:
 * - Validates JWT token during WebSocket handshake
 * - Extracts user identity ONLY from validated JWT
 * - NEVER trusts userId from query parameters
 * - Rejects connections with missing/invalid tokens
 * 
 * TOKEN EXTRACTION ORDER:
 * 1. Authorization header (preferred): "Bearer <token>"
 * 2. Query parameter (fallback): "?token=<token>"
 */
@Component
public class WebSocketHandshakeInterceptor implements HandshakeInterceptor {

    private static final Logger log = LoggerFactory.getLogger(WebSocketHandshakeInterceptor.class);
    private static final String AUTHORIZATION_HEADER = "Authorization";
    private static final String BEARER_PREFIX = "Bearer ";
    private static final String TOKEN_QUERY_PARAM = "token";

    private final JwtUtil jwtUtil;

    public WebSocketHandshakeInterceptor(JwtUtil jwtUtil) {
        this.jwtUtil = jwtUtil;
    }

    @Override
    public boolean beforeHandshake(ServerHttpRequest request, ServerHttpResponse response,
                                    WebSocketHandler wsHandler, Map<String, Object> attributes) throws Exception {

        log.debug("WebSocket handshake initiated: {}", request.getURI());

        // STEP 1: Extract JWT token
        String token = extractToken(request);
        
        if (token == null || token.isEmpty()) {
            log.warn("WebSocket handshake rejected: Missing JWT token");
            return false; // Reject handshake
        }

        // STEP 2: Validate JWT token
        if (!jwtUtil.validateToken(token)) {
            log.warn("WebSocket handshake rejected: Invalid or expired JWT token");
            return false; // Reject handshake
        }

        // STEP 3: Extract user identity from validated token
        Long userId = jwtUtil.getUserIdFromToken(token);
        String username = jwtUtil.getUsernameFromToken(token);

        if (userId == null) {
            log.warn("WebSocket handshake rejected: Failed to extract userId from token");
            return false; // Reject handshake
        }

        // STEP 4: Store validated user identity in WebSocket session attributes
        attributes.put("userId", userId.toString());
        attributes.put("username", username);

        // STEP 5: Extract gameId from query parameters (trusted for routing, not for authorization)
        String query = request.getURI().getQuery();
        if (query != null && query.contains("gameId=")) {
            String gameId = extractGameId(query);
            if (gameId != null) {
                attributes.put("gameId", gameId);
                log.debug("Extracted gameId from query: {}", gameId);
            }
        }

        log.info("WebSocket handshake accepted for user {} (ID: {}) for game {}", 
                 username, userId, attributes.get("gameId"));

        return true; // Allow handshake to proceed
    }

    @Override
    public void afterHandshake(ServerHttpRequest request, ServerHttpResponse response,
                               WebSocketHandler wsHandler, Exception exception) {
        // Post-handshake processing (if needed)
        if (exception != null) {
            log.error("WebSocket handshake failed: {}", exception.getMessage());
        }
    }

    /**
     * Extract JWT token from request
     * Priority: 1) Authorization header, 2) Query parameter
     */
    private String extractToken(ServerHttpRequest request) {
        // Try Authorization header first (preferred)
        List<String> authHeaders = request.getHeaders().get(AUTHORIZATION_HEADER);
        if (authHeaders != null && !authHeaders.isEmpty()) {
            String authHeader = authHeaders.get(0);
            if (authHeader.startsWith(BEARER_PREFIX)) {
                String token = authHeader.substring(BEARER_PREFIX.length());
                log.debug("JWT token extracted from Authorization header");
                return token;
            }
        }

        // Fallback to query parameter
        String query = request.getURI().getQuery();
        if (query != null && query.contains(TOKEN_QUERY_PARAM + "=")) {
            String token = extractQueryParam(query, TOKEN_QUERY_PARAM);
            if (token != null) {
                log.debug("JWT token extracted from query parameter");
                return token;
            }
        }

        return null;
    }

    /**
     * Extract gameId from query string
     */
    private String extractGameId(String query) {
        return extractQueryParam(query, "gameId");
    }

    /**
     * Extract query parameter value
     */
    private String extractQueryParam(String query, String paramName) {
        String[] params = query.split("&");
        for (String param : params) {
            if (param.startsWith(paramName + "=")) {
                return param.substring(paramName.length() + 1);
            }
        }
        return null;
    }
}
