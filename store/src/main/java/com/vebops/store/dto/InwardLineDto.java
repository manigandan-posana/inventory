package com.vebops.store.dto;

public record InwardLineDto(
    String id,
    String materialId,
    String code,
    String name,
    String unit,
    double orderedQty,
    double receivedQty
) {}
