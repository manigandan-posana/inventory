package com.vebops.store.dto;

public record ProcurementRequestDto(
    String id,
    String projectId,
    String projectCode,
    String projectName,
    String materialId,
    String materialCode,
    String materialName,
    String materialUnit,
    double capturedRequiredQty,
    double requestedIncrease,
    double proposedRequiredQty,
    Double resolvedRequiredQty,
    String reason,
    String status,
    String requestedBy,
    String requestedByRole,
    String requestedAt,
    String resolvedBy,
    String resolvedByRole,
    String resolvedAt,
    String resolutionNote
) {}
