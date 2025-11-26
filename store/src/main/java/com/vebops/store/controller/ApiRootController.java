package com.vebops.store.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Provides a minimal handler for the API root path. Without this
 * controller, requests to <code>/api</code> fall through to the static
 * resource handler and result in a {@code NoResourceFoundException}.
 * Returning a simple JSON object or plain text prevents the error and
 * signals that the API root has no resources.
 */
@RestController
@RequestMapping("/api")
public class ApiRootController {

    /**
     * Returns a brief message when the API root is requested. This avoids
     * the {@link org.springframework.web.servlet.resource.NoResourceFoundException}
     * logged by Spring when no resource matches <code>/api</code>.
     *
     * @return an informational response
     */
    @GetMapping
    public ResponseEntity<String> apiRoot() {
        return ResponseEntity.ok("Inventory API root. No resources available at this endpoint.");
    }
}