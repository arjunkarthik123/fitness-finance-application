package ca.flexin.api.common;

import java.util.Map;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Lightweight liveness check used by the mobile app. Actuator's /actuator/health has more detail.
 */
@RestController
public class HealthController {

    /**
     * Reports that the API is up.
     *
     * @return a status map
     */
    @GetMapping("/api/health")
    public Map<String, String> health() {
        return Map.of("status", "UP");
    }
}
