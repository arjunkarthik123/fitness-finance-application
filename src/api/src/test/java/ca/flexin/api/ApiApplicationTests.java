package ca.flexin.api;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

/**
 * Boots the whole app against H2, which also runs every Liquibase changeset
 * and checks the JPA entities against the resulting schema.
 */
@SpringBootTest
@ActiveProfiles("test")
class ApiApplicationTests {

    @Test
    void contextLoads() {
        // Passes if the context starts.
    }
}
