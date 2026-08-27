package org.example.adminreporting.config;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Component;

@Component
public class CurrentUserService {

    public Long getCurrentUserId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new IllegalStateException("Unauthenticated access");
        }

        Object principal = authentication.getPrincipal();
        if (principal instanceof Jwt jwt) {
            Object userIdClaim = jwt.getClaim("user_id");
            if (userIdClaim instanceof Number number) {
                return number.longValue();
            }
            if (userIdClaim instanceof String value) {
                try {
                    return Long.parseLong(value);
                } catch (NumberFormatException exception) {
                    throw new IllegalStateException("Invalid user_id token claim", exception);
                }
            }
        }

        throw new IllegalStateException("Missing user_id token claim");
    }
}
