package com.vebops.store.dto;

public record AnalyticsDto(
    long totalProjects,
    long totalMaterials,
    long totalUsers,
    double totalReceivedQty,
    double totalUtilizedQty
) {}
