package com.vebops.store.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public record LoginRequest(
    @Email(message = "A valid email address is required") @NotBlank(message = "Email is required") String email,
    @NotBlank(message = "Password is required") String password
) {}
