package com.vebops.store.dto;

public record OutwardLineDto(
    String id,
    String materialId,
    String code,
    String name,
    String unit,
    double issueQty
) {}
