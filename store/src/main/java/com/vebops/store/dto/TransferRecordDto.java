package com.vebops.store.dto;

import java.util.List;

public record TransferRecordDto(
    String id,
    String code,
    String fromProjectId,
    String fromProjectName,
    String fromSite,
    String toProjectId,
    String toProjectName,
    String toSite,
    String date,
    String remarks,
    List<TransferLineDto> lines
) {}
