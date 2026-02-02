/**
 * User Profile Service
 * Integrates with backend user-profile-service
 */

import { httpClient } from './httpClient';

export interface UserProfileResponse {
  userId: number;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  country: string | null;
  rating: number;
  gamesPlayed: number;
  gamesWon: number;
  gamesLost: number;
  gamesDrawn: number;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateProfileRequest {
  username?: string;
  displayName?: string;
  avatarUrl?: string;
  country?: string;
}

class ProfileService {
  private readonly BASE_URL = '/profiles';

  /**
   * Get current user's profile
   * Backend automatically creates profile if it doesn't exist
   */
  async getMyProfile(): Promise<UserProfileResponse> {
    const response = await httpClient.get<UserProfileResponse>(`${this.BASE_URL}/me`);
    return response.data;
  }

  /**
   * Update current user's profile
   * Only editable fields can be updated (username, displayName, avatarUrl, country)
   */
  async updateMyProfile(request: UpdateProfileRequest): Promise<UserProfileResponse> {
    const response = await httpClient.put<UserProfileResponse>(`${this.BASE_URL}/me`, request);
    return response.data;
  }
}

export const profileService = new ProfileService();
