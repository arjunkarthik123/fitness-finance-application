package ca.flexin.api.user;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * REST endpoints for user accounts.
 */
@RestController
@RequestMapping("/api/users")
public class UserController {

    private final UserService userService;

    /**
     * Creates the controller.
     *
     * @param userService user service
     */
    public UserController(UserService userService) {
        this.userService = userService;
    }

    /**
     * Gets one user.
     *
     * @param id user id
     * @return the user
     */
    @GetMapping("/{id}")
    public UserResponse getUser(@PathVariable long id) {
        return userService.getUser(id);
    }
}
