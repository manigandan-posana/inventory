package com.vebops.store.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CreateProjectRequest(
    @NotBlank(message = "Project code is required") @Size(max = 40, message = "Project code is too long") String code,
    @NotBlank(message = "Project name is required") @Size(max = 255, message = "Project name is too long") String name
) {}
