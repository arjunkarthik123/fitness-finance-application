package ca.flexin.api;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * Entry point for the Flexin API.
 */
@SpringBootApplication
public class ApiApplication {

    /**
     * Starts the Spring application.
     *
     * @param args command line arguments
     */
    public static void main(String[] args) {
        SpringApplication.run(ApiApplication.class, args);
    }
}
