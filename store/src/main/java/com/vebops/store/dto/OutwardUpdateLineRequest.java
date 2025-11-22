package com.vebops.store.dto;

public record OutwardUpdateLineRequest(String lineId, String materialId, double issueQty) {}
