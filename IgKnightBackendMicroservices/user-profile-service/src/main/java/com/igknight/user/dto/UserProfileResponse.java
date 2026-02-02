package com.igknight.user.dto;

import lombok.*;

import java.time.Instant;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserProfileResponse {

    private Long id;
    private Long userId;
    private String username;
    private String displayName;
    private String avatarUrl;
    private String country;
    private Integer rating;
    private Instant createdAt;
    private Instant updatedAt;
}
