package com.igknight.user.dto;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UpdateProfileRequest {

    private String username;
    private String displayName;
    private String avatarUrl;
    private String country;

    // Note: userId and rating are NOT editable via this request
}
