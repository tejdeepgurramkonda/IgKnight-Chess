package com.igknight.realtime.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.socket.config.annotation.EnableWebSocket;
import org.springframework.web.socket.config.annotation.WebSocketConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistry;

import com.igknight.realtime.handler.GameWebSocketHandler;
import com.igknight.realtime.interceptor.WebSocketHandshakeInterceptor;

/**
 * WebSocket configuration for realtime game service with JWT authentication
 * CORS origins are configurable via environment variable for production deployment
 */
@Configuration
@EnableWebSocket
public class WebSocketConfig implements WebSocketConfigurer {

    private final GameWebSocketHandler gameWebSocketHandler;
    private final WebSocketHandshakeInterceptor webSocketHandshakeInterceptor;

    @Value("${cors.allowed.origins}")
    private String allowedOrigins;

    public WebSocketConfig(GameWebSocketHandler gameWebSocketHandler,
                          WebSocketHandshakeInterceptor webSocketHandshakeInterceptor) {
        this.gameWebSocketHandler = gameWebSocketHandler;
        this.webSocketHandshakeInterceptor = webSocketHandshakeInterceptor;
    }

    @Override
    public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
        // Split comma-separated origins from environment variable
        String[] origins = allowedOrigins.split(",");
        
        registry.addHandler(gameWebSocketHandler, "/ws/game")
                .addInterceptors(webSocketHandshakeInterceptor) // Use injected interceptor with JWT validation
                .setAllowedOrigins(origins); // Production-safe: configurable via CORS_ALLOWED_ORIGINS env var
    }
}
