package com.igknight.game.websocket;

import java.security.Principal;
import java.util.List;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.config.ChannelRegistration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

/**
 * WebSocket configuration for STOMP chat service
 * CORS origins are configurable via environment variable for production deployment
 */
@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    @Value("${cors.allowed.origins}")
    private String allowedOrigins;

    @Override
    public void configureMessageBroker(MessageBrokerRegistry config) {
        config.enableSimpleBroker("/topic", "/queue");
        config.setApplicationDestinationPrefixes("/app");
        config.setUserDestinationPrefix("/user");
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        // Split comma-separated origins from environment variable
        String[] origins = allowedOrigins.split(",");
        
        registry.addEndpoint("/ws/chess")
                .setAllowedOrigins(origins) // Production-safe: configurable via CORS_ALLOWED_ORIGINS env var
                .withSockJS();
    }

    @Override
    public void configureClientInboundChannel(ChannelRegistration registration) {
        registration.interceptors(new ChannelInterceptor() {
            @Override
            public Message<?> preSend(Message<?> message, MessageChannel channel) {
                StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
                
                if (accessor != null && StompCommand.CONNECT.equals(accessor.getCommand())) {
                    // Extract user ID from X-User-Id header
                    List<String> userIdHeader = accessor.getNativeHeader("X-User-Id");
                    List<String> usernameHeader = accessor.getNativeHeader("X-Username");

                    if (userIdHeader != null && !userIdHeader.isEmpty()) {
                        try {
                            Long userId = Long.parseLong(userIdHeader.get(0));
                            String username = (usernameHeader != null && !usernameHeader.isEmpty())
                                ? usernameHeader.get(0)
                                : "user-" + userId;

                            // Store username in session attributes so it persists
                            accessor.getSessionAttributes().put("username", username);
                            accessor.getSessionAttributes().put("userId", userId);

                            // Create a simple principal with user ID
                            Principal principal = () -> userId.toString();
                            accessor.setUser(principal);
                            
                            System.out.println("STOMP CONNECT: userId=" + userId + ", username=" + username);
                        } catch (NumberFormatException e) {
                            // Invalid user ID format
                        }
                    }
                }
                
                return message;
            }
        });
    }
}
