package com.vebops.store.dto;

import java.util.List;

public record InwardRequest(
    String code,
    String projectId,
    String type,
    String invoiceNo,
    String invoiceDate,
    String deliveryDate,
    String vehicleNo,
    String remarks,
    String supplierName,
    List<InwardLineRequest> lines
) {}
