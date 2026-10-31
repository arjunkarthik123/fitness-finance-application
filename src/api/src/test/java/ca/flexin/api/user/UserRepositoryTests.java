package ca.flexin.api.user;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.test.context.ActiveProfiles;

@DataJpaTest
@ActiveProfiles("test")
class UserRepositoryTests {

    @Autowired
    private UserRepository users;

    @Test
    void savesAndFindsByUsername() {
        User saved = users.saveAndFlush(new User("alex", "alex@example.com", "hash"));

        assertThat(saved.getCreatedAt()).isNotNull();

        assertThat(users.findByUsername("alex"))
            .hasValueSatisfying(user -> assertThat(user.getEmail()).isEqualTo("alex@example.com"));
    }
}
