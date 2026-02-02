package com.igknight.auth.controller;

import com.igknight.auth.dto.AuthResponse;
import com.igknight.auth.dto.SignInRequest;
import com.igknight.auth.dto.SignUpRequest;
import com.igknight.auth.service.AuthService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    // Primary endpoints - /api/auth/signup and /api/auth/signin
    @PostMapping({"/api/auth/signup", "/signup"})
    public ResponseEntity<AuthResponse> signUp(@Valid @RequestBody SignUpRequest request) {
        AuthResponse response = authService.signUp(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PostMapping({"/api/auth/signin", "/signin"})
    public ResponseEntity<AuthResponse> signIn(@Valid @RequestBody SignInRequest request) {
        AuthResponse response = authService.signIn(request);
        return ResponseEntity.ok(response);
    }
}
