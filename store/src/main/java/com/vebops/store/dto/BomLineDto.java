package com.vebops.store.dto;

public record BomLineDto(
    String id,
    String projectId,
    String materialId,
    String code,
    String name,
    String partNo,
    String lineType,
    String unit,
    String category,
    double allocatedQty,
    double requiredQty,
    double orderedQty,
    double receivedQty,
    double utilizedQty,
    double balanceQty
) {}
