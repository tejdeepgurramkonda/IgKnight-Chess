package com.igknight.auth.security;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;

import lombok.RequiredArgsConstructor;

/**
 * Security Configuration for Auth Service with Google OAuth2
 *
 * PURPOSE:
 * - Auth Service issues JWT tokens (signup/signin/oauth)
 * - Auth Service does NOT validate JWT tokens
 * - API Gateway handles ALL JWT validation
 *
 * RESPONSIBILITIES:
 * - Provide password encoder for BCrypt hashing
 * - Allow public access to auth endpoints
 * - Enable Google OAuth2 login flow
 * - Handle OAuth2 success/failure redirects
 * - Use stateless session (no session cookies for JWT endpoints)
 */
@Configuration
@EnableWebSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final OAuth2AuthenticationSuccessHandler oAuth2SuccessHandler;
    private final OAuth2AuthenticationFailureHandler oAuth2FailureHandler;

    /**
     * Password encoder for hashing user passwords during signup
     * Used by AuthService to hash passwords before storing in database
     */
    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    /**
     * Security filter chain with OAuth2 support
     *
     * Auth Service does NOT validate JWT on incoming requests.
     * OAuth2 flow creates a temporary session during login,
     * then issues JWT and redirects to frontend.
     */
    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            // Disable CSRF - not needed for stateless REST API
            .csrf(csrf -> csrf.disable())

            // CORS is handled by API Gateway - do NOT configure here
            .cors(cors -> cors.disable())

            // Session management: OAuth2 REQUIRES sessions for authorization flow
            // Session is used to store OAuth2 state during Google redirect
            .sessionManagement(session ->
                session.sessionCreationPolicy(SessionCreationPolicy.IF_REQUIRED))

            // Authorization rules
            .authorizeHttpRequests(auth -> auth
                // Auth endpoints - must be public (users don't have tokens yet)
                .requestMatchers("/api/auth/**").permitAll()
                .requestMatchers("/auth/**").permitAll()
                .requestMatchers("/signup", "/signin").permitAll() // Root-level endpoints

                // OAuth2 endpoints - must be public for OAuth flow
                .requestMatchers("/oauth2/**").permitAll()
                .requestMatchers("/login/oauth2/**").permitAll()

                // Actuator endpoints - public for health checks
                .requestMatchers("/actuator/**").permitAll()

                // Health check
                .requestMatchers("/health").permitAll()

                // Any other endpoint - allow for now
                .anyRequest().permitAll()
            )

            // Enable OAuth2 login
            .oauth2Login(oauth2 -> oauth2
                .successHandler(oAuth2SuccessHandler)
                .failureHandler(oAuth2FailureHandler)
            );

        return http.build();
    }
}
