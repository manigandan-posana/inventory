package com.vebops.store.dto;

import java.util.List;
import java.util.Map;

public record AppBootstrapResponse(
    UserDto user,
    List<ProjectDto> projects,
    List<ProjectDto> assignedProjects,
    Map<String, List<BomLineDto>> bom,
    List<MaterialDto> materials,
    List<InwardRecordDto> inwardHistory,
    List<OutwardRegisterDto> outwardHistory,
    List<TransferRecordDto> transferHistory,
    List<ProcurementRequestDto> procurementRequests,
    InventoryCodesResponse inventoryCodes
) {}
