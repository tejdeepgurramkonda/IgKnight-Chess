package com.igknight.user.service;

import com.igknight.user.dto.UpdateProfileRequest;
import com.igknight.user.dto.UserProfileResponse;
import com.igknight.user.entity.UserProfile;
import com.igknight.user.repository.UserProfileRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Slf4j
public class UserProfileService {

    private final UserProfileRepository userProfileRepository;

    /**
     * Fetch profile by userId. If not found, create a new profile automatically.
     */
    @Transactional
    public UserProfileResponse getOrCreateProfile(Long userId) {
        log.info("Fetching or creating profile for userId: {}", userId);

        UserProfile profile = userProfileRepository.findByUserId(userId)
                .orElseGet(() -> createDefaultProfile(userId));

        return mapToResponse(profile);
    }

    /**
     * Update editable fields of user profile.
     * Only updates non-null fields from the request.
     */
    @Transactional
    public UserProfileResponse updateProfile(Long userId, UpdateProfileRequest request) {
        log.info("Updating profile for userId: {}", userId);

        UserProfile profile = userProfileRepository.findByUserId(userId)
                .orElseThrow(() -> new IllegalArgumentException("Profile not found for userId: " + userId));

        // Update only editable fields
        if (request.getUsername() != null) {
            // Check if username is already taken by another user
            userProfileRepository.findByUserId(userId)
                    .filter(p -> !p.getUserId().equals(userId) && p.getUsername().equals(request.getUsername()))
                    .ifPresent(p -> {
                        throw new IllegalArgumentException("Username already taken: " + request.getUsername());
                    });
            profile.setUsername(request.getUsername());
        }

        if (request.getDisplayName() != null) {
            profile.setDisplayName(request.getDisplayName());
        }

        if (request.getAvatarUrl() != null) {
            profile.setAvatarUrl(request.getAvatarUrl());
        }

        if (request.getCountry() != null) {
            profile.setCountry(request.getCountry());
        }

        UserProfile updatedProfile = userProfileRepository.save(profile);
        log.info("Profile updated successfully for userId: {}", userId);

        return mapToResponse(updatedProfile);
    }

    /**
     * Create a default profile with initial values.
     */
    private UserProfile createDefaultProfile(Long userId) {
        log.info("Creating default profile for userId: {}", userId);

        UserProfile profile = UserProfile.builder()
                .userId(userId)
                .username("user-" + userId)
                .rating(1200)
                .build();

        UserProfile savedProfile = userProfileRepository.save(profile);
        log.info("Default profile created successfully for userId: {}", userId);

        return savedProfile;
    }

    /**
     * Manual mapping from entity to response DTO.
     */
    private UserProfileResponse mapToResponse(UserProfile profile) {
        return UserProfileResponse.builder()
                .id(profile.getId())
                .userId(profile.getUserId())
                .username(profile.getUsername())
                .displayName(profile.getDisplayName())
                .avatarUrl(profile.getAvatarUrl())
                .country(profile.getCountry())
                .rating(profile.getRating())
                .createdAt(profile.getCreatedAt())
                .updatedAt(profile.getUpdatedAt())
                .build();
    }
}
