package com.vebops.store.controller;

import com.vebops.store.dto.BomAllocationRequest;
import com.vebops.store.dto.BomLineDto;
import com.vebops.store.exception.BadRequestException;
import com.vebops.store.exception.UnauthorizedException;
import com.vebops.store.model.Role;
import com.vebops.store.model.UserAccount;
import com.vebops.store.service.AuthService;
import com.vebops.store.service.BomService;
import java.util.List;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/bom")
public class BomController {

    private final AuthService authService;
    private final BomService bomService;

    public BomController(AuthService authService, BomService bomService) {
        this.authService = authService;
        this.bomService = bomService;
    }

    @GetMapping("/projects/{projectId}")
    public List<BomLineDto> listLines(
        @RequestHeader("X-Auth-Token") String token,
        @PathVariable String projectId
    ) {
        UserAccount user = authService.requireUser(token);
        ensureAllocationRole(user);
        return bomService.listLines(projectId);
    }

    @PostMapping("/projects/{projectId}/materials")
    public BomLineDto createLine(
        @RequestHeader("X-Auth-Token") String token,
        @PathVariable String projectId,
        @RequestBody BomAllocationRequest request
    ) {
        UserAccount user = authService.requireUser(token);
        ensureAllocationRole(user);
        double quantity = request != null ? request.quantity() : 0d;
        String resolvedProjectId = (request != null && StringUtils.hasText(request.projectId())) ? request.projectId() : projectId;
        String resolvedMaterialId = request != null ? request.materialId() : null;
        if (!StringUtils.hasText(resolvedMaterialId)) {
            throw new BadRequestException("Material id is required");
        }
        return bomService.assignQuantity(resolvedProjectId, resolvedMaterialId, quantity);
    }

    @PutMapping("/projects/{projectId}/materials/{materialId}")
    public BomLineDto assignQuantity(
        @RequestHeader("X-Auth-Token") String token,
        @PathVariable String projectId,
        @PathVariable String materialId,
        @RequestBody BomAllocationRequest request
    ) {
        UserAccount user = authService.requireUser(token);
        ensureAllocationRole(user);
        double quantity = request != null ? request.quantity() : 0d;
        String resolvedProjectId = (request != null && StringUtils.hasText(request.projectId())) ? request.projectId() : projectId;
        String resolvedMaterialId = (request != null && StringUtils.hasText(request.materialId())) ? request.materialId() : materialId;
        return bomService.assignQuantity(resolvedProjectId, resolvedMaterialId, quantity);
    }

    @DeleteMapping("/projects/{projectId}/materials/{materialId}")
    public void deleteLine(
        @RequestHeader("X-Auth-Token") String token,
        @PathVariable String projectId,
        @PathVariable String materialId
    ) {
        UserAccount user = authService.requireUser(token);
        ensureAllocationRole(user);
        bomService.deleteLine(projectId, materialId);
    }

    private void ensureAllocationRole(UserAccount user) {
        if (user == null || user.getRole() == null) {
            throw new UnauthorizedException("Allocation role required");
        }
        Role role = user.getRole();
        if (role != Role.ADMIN && role != Role.CEO && role != Role.COO && role != Role.PROJECT_HEAD) {
            throw new UnauthorizedException("Only Admin, CEO, COO or Project Head can manage allocations");
        }
    }
}
