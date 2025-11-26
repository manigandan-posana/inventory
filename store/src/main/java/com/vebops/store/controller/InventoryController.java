package com.vebops.store.controller;

import com.vebops.store.dto.InventoryCodesResponse;
import com.vebops.store.dto.InwardRequest;
import com.vebops.store.dto.OutwardRequest;
import com.vebops.store.dto.OutwardUpdateRequest;
import com.vebops.store.dto.TransferRequest;
import com.vebops.store.service.AuthService;
import com.vebops.store.service.InventoryService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
public class InventoryController {

    private final InventoryService inventoryService;
    private final AuthService authService;

    public InventoryController(InventoryService inventoryService, AuthService authService) {
        this.inventoryService = inventoryService;
        this.authService = authService;
    }

    @GetMapping("/inventory/codes")
    public InventoryCodesResponse nextCodes(@RequestHeader("X-Auth-Token") String token) {
        authService.requireUser(token);
        return inventoryService.generateCodes();
    }

    @PostMapping("/inwards")
    public ResponseEntity<Void> createInward(@RequestHeader("X-Auth-Token") String token, @RequestBody InwardRequest request) {
        authService.requireUser(token);
        inventoryService.registerInward(request);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/outwards")
    public ResponseEntity<Void> createOutward(@RequestHeader("X-Auth-Token") String token, @RequestBody OutwardRequest request) {
        authService.requireUser(token);
        inventoryService.registerOutward(request);
        return ResponseEntity.ok().build();
    }

    @PutMapping("/outwards/{id}")
    public ResponseEntity<Void> updateOutward(
        @RequestHeader("X-Auth-Token") String token,
        @PathVariable Long id,
        @RequestBody OutwardUpdateRequest request
    ) {
        authService.requireUser(token);
        inventoryService.updateOutward(id, request);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/transfers")
    public ResponseEntity<Void> createTransfer(
        @RequestHeader("X-Auth-Token") String token,
        @RequestBody TransferRequest request
    ) {
        authService.requireUser(token);
        inventoryService.registerTransfer(request);
        return ResponseEntity.ok().build();
    }
}
