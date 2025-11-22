package com.vebops.store.controller;

import com.vebops.store.dto.AppBootstrapResponse;
import com.vebops.store.dto.InwardRecordDto;
import com.vebops.store.dto.MaterialMovementDto;
import com.vebops.store.model.UserAccount;
import com.vebops.store.service.AppDataService;
import com.vebops.store.service.AuthService;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/app")
public class AppController {

    private final AuthService authService;
    private final AppDataService appDataService;

    public AppController(AuthService authService, AppDataService appDataService) {
        this.authService = authService;
        this.appDataService = appDataService;
    }

    @GetMapping("/bootstrap")
    public AppBootstrapResponse bootstrap(@RequestHeader("X-Auth-Token") String token) {
        UserAccount user = authService.requireUser(token);
        return appDataService.bootstrap(user);
    }

    @GetMapping("/materials/{materialId}/inwards")
    public List<InwardRecordDto> materialInwardHistory(
        @RequestHeader("X-Auth-Token") String token,
        @PathVariable Long materialId
    ) {
        UserAccount user = authService.requireUser(token);
        return appDataService.materialInwardHistory(user, materialId);
    }

    @GetMapping("/materials/{materialId}/movements")
    public MaterialMovementDto materialMovementHistory(
        @RequestHeader("X-Auth-Token") String token,
        @PathVariable Long materialId
    ) {
        UserAccount user = authService.requireUser(token);
        return appDataService.materialMovementHistory(user, materialId);
    }
}
