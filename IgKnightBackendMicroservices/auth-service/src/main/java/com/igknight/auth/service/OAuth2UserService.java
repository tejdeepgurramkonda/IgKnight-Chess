package com.igknight.auth.service;

import com.igknight.auth.entity.User;
import com.igknight.auth.repository.UserRepository;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Service
public class OAuth2UserService {

    private final UserRepository userRepository;

    public OAuth2UserService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    public User processOAuth2User(String provider, OAuth2User oAuth2User) {
        String email = oAuth2User.getAttribute("email");
        String name = oAuth2User.getAttribute("name");
        String providerId = oAuth2User.getAttribute("sub");

        // Check if user already exists
        Optional<User> existingUser = userRepository.findByEmail(email);
        
        if (existingUser.isPresent()) {
            User user = existingUser.get();
            // Update provider info if user signed up with local auth before
            if (user.getProvider() == null || user.getProvider().equals("local")) {
                user.setProvider(provider);
                user.setProviderId(providerId);
                return userRepository.save(user);
            }
            return user;
        }

        // Create new user
        User newUser = new User();
        newUser.setUsername(generateUsername(email));
        newUser.setEmail(email);
        newUser.setProvider(provider);
        newUser.setProviderId(providerId);
        newUser.setCountry("Not Specified"); // Default country for OAuth users
        
        return userRepository.save(newUser);
    }

    private String generateUsername(String email) {
        String baseUsername = email.split("@")[0];
        String username = baseUsername;
        int counter = 1;
        
        while (userRepository.findByUsername(username).isPresent()) {
            username = baseUsername + counter;
            counter++;
        }
        
        return username;
    }
}
