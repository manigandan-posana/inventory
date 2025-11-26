package com.vebops.store.dto;

import java.util.List;

public record MaterialMovementDto(
    List<InwardRecordDto> inwards,
    List<OutwardRegisterDto> outwards
) {}
