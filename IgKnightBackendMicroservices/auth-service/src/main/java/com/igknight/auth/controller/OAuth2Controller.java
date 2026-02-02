package com.igknight.auth.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
public class OAuth2Controller {

    @GetMapping("/oauth2/authorization/google")
    public String googleLogin() {
        // This endpoint will be automatically handled by Spring Security OAuth2
        // Redirects to Google OAuth2 authorization
        return "redirect:/oauth2/authorization/google";
    }
}
