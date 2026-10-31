package ca.flexin.api.user;

import java.time.Instant;

/**
 * Public view of a {@link User}. Never expose the entity (and its password hash) directly.
 * Email is left out because this endpoint is readable by anyone until authentication exists.
 *
 * @param id user id
 * @param username username
 * @param createdAt when the account was created
 */
public record UserResponse(Long id, String username, Instant createdAt) {

    static UserResponse from(User user) {
        return new UserResponse(user.getId(), user.getUsername(), user.getCreatedAt());
    }
}
