package com.igknight.auth.security;

import java.io.IOException;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.authentication.SimpleUrlAuthenticationFailureHandler;
import org.springframework.stereotype.Component;
import org.springframework.web.util.UriComponentsBuilder;

import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;

/**
 * OAuth2 Authentication Failure Handler
 * 
 * Handles failed Google OAuth2 login attempts by redirecting
 * to frontend with error information
 */
@Component
@Slf4j
public class OAuth2AuthenticationFailureHandler extends SimpleUrlAuthenticationFailureHandler {

    @Value("${frontend.url}")
    private String frontendUrl;

    @Override
    public void onAuthenticationFailure(HttpServletRequest request, HttpServletResponse response,
                                        AuthenticationException exception) throws IOException, ServletException {
        
        log.error("OAuth2 authentication failed: {}", exception.getMessage());
        
        String errorUrl = UriComponentsBuilder.fromUriString(frontendUrl + "/login")
                .queryParam("error", "oauth_failed")
                .queryParam("message", exception.getMessage())
                .build()
                .toUriString();
        
        getRedirectStrategy().sendRedirect(request, response, errorUrl);
    }
}
