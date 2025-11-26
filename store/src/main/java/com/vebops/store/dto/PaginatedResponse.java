package com.vebops.store.dto;

import java.util.List;
import java.util.Map;

public record PaginatedResponse<T>(
    List<T> items,
    long totalItems,
    int page,
    int size,
    int totalPages,
    boolean hasNext,
    boolean hasPrevious,
    Map<String, List<String>> filters
) {}
