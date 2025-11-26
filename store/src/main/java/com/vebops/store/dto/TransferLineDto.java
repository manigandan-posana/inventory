package com.vebops.store.dto;

public record TransferLineDto(
    String id,
    String materialId,
    String code,
    String name,
    String unit,
    double transferQty
) {}
