package com.vebops.store.dto;

import java.util.List;

public record OutwardRequest(
    String code,
    String projectId,
    String issueTo,
    String status,
    String closeDate,
    String date,
    List<OutwardLineRequest> lines
) {}
