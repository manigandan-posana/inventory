package com.vebops.store.controller;

import com.vebops.store.dto.CreateProcurementRequest;
import com.vebops.store.dto.ProcurementRequestDto;
import com.vebops.store.dto.ResolveProcurementRequest;
import com.vebops.store.model.UserAccount;
import com.vebops.store.service.AuthService;
import com.vebops.store.service.ProcurementService;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/procurement")
public class ProcurementController {

    private final AuthService authService;
    private final ProcurementService procurementService;

    public ProcurementController(AuthService authService, ProcurementService procurementService) {
        this.authService = authService;
        this.procurementService = procurementService;
    }

    @GetMapping("/requests")
    public List<ProcurementRequestDto> list(@RequestHeader("X-Auth-Token") String token) {
        UserAccount user = authService.requireUser(token);
        return procurementService.listRequests(user);
    }

    @PostMapping("/requests")
    public ProcurementRequestDto create(
        @RequestHeader("X-Auth-Token") String token,
        @RequestBody CreateProcurementRequest request
    ) {
        UserAccount user = authService.requireUser(token);
        return procurementService.createRequest(user, request);
    }

    @PostMapping("/requests/{id}/decision")
    public ProcurementRequestDto decide(
        @RequestHeader("X-Auth-Token") String token,
        @PathVariable Long id,
        @RequestBody ResolveProcurementRequest request
    ) {
        UserAccount user = authService.requireUser(token);
        return procurementService.resolveRequest(user, id, request);
    }
}
