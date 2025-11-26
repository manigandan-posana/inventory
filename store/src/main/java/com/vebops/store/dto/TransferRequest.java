package com.vebops.store.dto;

import java.util.List;

public record TransferRequest(
    String code,
    String fromProjectId,
    String toProjectId,
    String fromSite,
    String toSite,
    String remarks,
    List<TransferLineRequest> lines
) {}
