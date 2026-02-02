package com.igknight.user.controller;

import com.igknight.user.dto.UpdateProfileRequest;
import com.igknight.user.dto.UserProfileResponse;
import com.igknight.user.service.UserProfileService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/profiles")
@RequiredArgsConstructor
@Slf4j
public class UserProfileController {

    private final UserProfileService userProfileService;

    /**
     * GET /profiles/me
     * Fetch the current user's profile.
     * If profile doesn't exist, create it automatically with default values.
     *
     * @param userIdHeader - The X-User-Id header injected by API Gateway
     * @return UserProfileResponse
     */
    @GetMapping("/me")
    public ResponseEntity<UserProfileResponse> getMyProfile(
            @RequestHeader(value = "X-User-Id", required = false) String userIdHeader) {

        log.info("GET /profiles/me - X-User-Id: {}", userIdHeader);

        // Validate X-User-Id header presence
        if (userIdHeader == null || userIdHeader.isBlank()) {
            log.warn("Missing or empty X-User-Id header");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        // Parse userId from header
        Long userId;
        try {
            userId = Long.parseLong(userIdHeader);
        } catch (NumberFormatException e) {
            log.error("Invalid X-User-Id format: {}", userIdHeader);
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
        }

        // Get or create profile
        UserProfileResponse profile = userProfileService.getOrCreateProfile(userId);

        return ResponseEntity.ok(profile);
    }

    /**
     * PUT /profiles/me
     * Update the current user's profile.
     * Only updates editable fields (username, displayName, avatarUrl, country).
     * userId and rating cannot be modified via this endpoint.
     *
     * @param userIdHeader - The X-User-Id header injected by API Gateway
     * @param request - UpdateProfileRequest containing editable fields
     * @return Updated UserProfileResponse
     */
    @PutMapping("/me")
    public ResponseEntity<UserProfileResponse> updateMyProfile(
            @RequestHeader(value = "X-User-Id", required = false) String userIdHeader,
            @RequestBody UpdateProfileRequest request) {

        log.info("PUT /profiles/me - X-User-Id: {}", userIdHeader);

        // Validate X-User-Id header presence
        if (userIdHeader == null || userIdHeader.isBlank()) {
            log.warn("Missing or empty X-User-Id header");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        // Parse userId from header
        Long userId;
        try {
            userId = Long.parseLong(userIdHeader);
        } catch (NumberFormatException e) {
            log.error("Invalid X-User-Id format: {}", userIdHeader);
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
        }

        // Update profile
        UserProfileResponse updatedProfile = userProfileService.updateProfile(userId, request);

        return ResponseEntity.ok(updatedProfile);
    }
}
