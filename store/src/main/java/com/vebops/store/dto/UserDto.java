package com.vebops.store.dto;

import java.util.List;

public record UserDto(
    String id,
    String name,
    String email,
    String role,
    String accessType,
    List<ProjectDto> projects
) {}
