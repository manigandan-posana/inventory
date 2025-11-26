package com.vebops.store.dto;

public record MaterialDto(
    String id,
    String code,
    String name,
    String partNo,
    String lineType,
    String unit,
    String category,
    double requiredQty,
    double orderedQty,
    double receivedQty,
    double utilizedQty,
    double balanceQty
) {}
