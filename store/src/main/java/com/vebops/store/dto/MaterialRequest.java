package com.vebops.store.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record MaterialRequest(
    @Size(max = 50, message = "Material code is too long") String code,
    @NotBlank(message = "Material name is required") @Size(max = 255, message = "Material name is too long") String name,
    @Size(max = 120, message = "Part number is too long") String partNo,
    @Size(max = 120, message = "Line type is too long") String lineType,
    @Size(max = 120, message = "Unit is too long") String unit,
    @Size(max = 120, message = "Category is too long") String category
) {}
