package ca.flexin.api.user;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

/**
 * Business logic for user accounts.
 */
@Service
public class UserService {

    private final UserRepository users;

    /**
     * Creates the service.
     *
     * @param users user repository
     */
    public UserService(UserRepository users) {
        this.users = users;
    }

    /**
     * Looks up a user by id.
     *
     * @param id user id
     * @return the user
     * @throws ResponseStatusException 404 if no such user exists
     */
    public UserResponse getUser(long id) {
        return users.findById(id)
            .map(UserResponse::from)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
    }
}
