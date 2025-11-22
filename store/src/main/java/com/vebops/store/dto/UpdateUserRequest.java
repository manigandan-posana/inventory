package com.vebops.store.dto;

import java.util.List;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;

public record UpdateUserRequest(
    @NotBlank(message = "Name is required") @Size(max = 120, message = "Name is too long") String name,
    @Size(min = 6, max = 64, message = "Password must be between 6 and 64 characters") String password,
    @NotBlank(message = "Role is required") String role,
    @NotBlank(message = "Access type is required") String accessType,
    @NotEmpty(message = "At least one project must be assigned") List<String> projectIds
) {}
