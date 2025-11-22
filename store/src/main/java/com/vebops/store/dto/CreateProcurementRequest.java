package com.vebops.store.dto;

public record CreateProcurementRequest(String projectId, String materialId, double increaseQty, String reason) {}
