package com.vebops.store.dto;

import java.util.List;

public record InwardRecordDto(
    String id,
    String projectId,
    String projectName,
    String code,
    String date,
    String deliveryDate,
    String invoiceNo,
    String supplierName,
    int items,
    List<InwardLineDto> lines
) {}
