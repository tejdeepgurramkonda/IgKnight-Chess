package com.igknight.auth.security;

import com.igknight.auth.entity.User;
import com.igknight.auth.service.OAuth2UserService;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.SimpleUrlAuthenticationSuccessHandler;
import org.springframework.stereotype.Component;
import org.springframework.web.util.UriComponentsBuilder;

import java.io.IOException;

/**
 * OAuth2 Authentication Success Handler
 * 
 * Handles successful Google OAuth2 login by:
 * 1. Processing OAuth2 user data
 * 2. Creating or updating user in database
 * 3. Generating JWT token
 * 4. Redirecting to frontend with token
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class OAuth2AuthenticationSuccessHandler extends SimpleUrlAuthenticationSuccessHandler {

    private final OAuth2UserService oAuth2UserService;
    private final JwtUtil jwtUtil;

    @Value("${frontend.url}")
    private String frontendUrl;

    @Override
    public void onAuthenticationSuccess(HttpServletRequest request, HttpServletResponse response,
                                        Authentication authentication) throws IOException, ServletException {
        
        log.info("OAuth2 authentication successful");

        if (authentication.getPrincipal() instanceof OAuth2User) {
            OAuth2User oAuth2User = (OAuth2User) authentication.getPrincipal();
            
            try {
                // Process OAuth2 user (create or update in database)
                User user = oAuth2UserService.processOAuth2User("google", oAuth2User);
                
                // Generate JWT token
                String token = jwtUtil.generateToken(user.getUsername(), user.getId());

                log.info("Generated JWT token for OAuth2 user: {}", user.getUsername());
                
                // Build redirect URL to frontend with token
                String redirectUrl = UriComponentsBuilder.fromUriString(frontendUrl + "/oauth2/callback")
                        .queryParam("token", token)
                        .queryParam("userId", user.getId())
                        .queryParam("username", user.getUsername())
                        .queryParam("email", user.getEmail())
                        .build()
                        .toUriString();
                
                log.info("Redirecting to frontend: {}", redirectUrl);
                
                getRedirectStrategy().sendRedirect(request, response, redirectUrl);
                
            } catch (Exception e) {
                log.error("Error processing OAuth2 user", e);
                
                // Redirect to frontend with error
                String errorUrl = UriComponentsBuilder.fromUriString(frontendUrl + "/login")
                        .queryParam("error", "oauth_failed")
                        .queryParam("message", e.getMessage())
                        .build()
                        .toUriString();
                
                getRedirectStrategy().sendRedirect(request, response, errorUrl);
            }
        } else {
            log.error("OAuth2 authentication principal is not OAuth2User");
            response.sendRedirect(frontendUrl + "/login?error=invalid_auth");
        }
    }
}
