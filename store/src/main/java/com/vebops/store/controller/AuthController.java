package com.vebops.store.controller;

import com.vebops.store.dto.LoginRequest;
import com.vebops.store.dto.LoginResponse;
import com.vebops.store.dto.UserDto;
import com.vebops.store.service.AuthService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/login")
    public LoginResponse login(@Valid @RequestBody LoginRequest request) {
        return authService.login(request);
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(@RequestHeader("X-Auth-Token") String token) {
        authService.logout(token);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/session")
    public UserDto session(@RequestHeader("X-Auth-Token") String token) {
        return authService.toUserDto(authService.requireUser(token));
    }
}
