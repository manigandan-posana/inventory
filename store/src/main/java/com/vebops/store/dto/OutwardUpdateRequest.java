package com.vebops.store.dto;

import java.util.List;

public record OutwardUpdateRequest(
    String status,
    String closeDate,
    String issueTo,
    List<OutwardUpdateLineRequest> lines
) {}
