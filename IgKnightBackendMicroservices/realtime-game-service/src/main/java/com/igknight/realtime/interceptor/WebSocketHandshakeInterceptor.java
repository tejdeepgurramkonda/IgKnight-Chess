package com.igknight.realtime.interceptor;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.web.socket.WebSocketHandler;
import org.springframework.web.socket.server.HandshakeInterceptor;

import java.util.Map;

/**
 * Interceptor to extract headers and query parameters during WebSocket handshake
 */
public class WebSocketHandshakeInterceptor implements HandshakeInterceptor {

    private static final Logger log = LoggerFactory.getLogger(WebSocketHandshakeInterceptor.class);

    @Override
    public boolean beforeHandshake(ServerHttpRequest request, ServerHttpResponse response,
                                    WebSocketHandler wsHandler, Map<String, Object> attributes) throws Exception {

        // Extract X-User-Id from headers
        if (request.getHeaders().containsKey("X-User-Id")) {
            String userId = request.getHeaders().getFirst("X-User-Id");
            attributes.put("userId", userId);
            log.debug("Extracted userId from header: {}", userId);
        }

        // Extract gameId from query parameters
        String query = request.getURI().getQuery();
        if (query != null && query.contains("gameId=")) {
            String gameId = extractGameId(query);
            if (gameId != null) {
                attributes.put("gameId", gameId);
                log.debug("Extracted gameId from query: {}", gameId);
            }
        }

        return true; // Allow handshake to proceed
    }

    @Override
    public void afterHandshake(ServerHttpRequest request, ServerHttpResponse response,
                               WebSocketHandler wsHandler, Exception exception) {
        // Nothing to do after handshake
    }

    private String extractGameId(String query) {
        String[] params = query.split("&");
        for (String param : params) {
            if (param.startsWith("gameId=")) {
                return param.substring("gameId=".length());
            }
        }
        return null;
    }
}
