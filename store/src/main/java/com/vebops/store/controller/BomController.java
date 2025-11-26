package com.vebops.store.controller;

import com.vebops.store.dto.BomAllocationRequest;
import com.vebops.store.dto.BomLineDto;
import com.vebops.store.dto.PaginatedResponse;
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
import org.springframework.web.bind.annotation.RequestParam;
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

    /**
     * Returns paginated bill‑of‑materials lines for the given project. If the
     * page or size parameters are missing or invalid, sensible defaults are
     * applied. The returned {@link com.vebops.store.dto.PaginatedResponse}
     * mirrors the structure used by other endpoints in this application.
     *
     * @param token authentication token (required)
     * @param projectId the project identifier (required)
     * @param page optional 1‑based page number (defaults to 1)
     * @param size optional page size (defaults to 10)
     * @return a paginated response containing BOM lines for the project
     */
    @GetMapping("/projects/{projectId}")
    public PaginatedResponse<BomLineDto> listLines(
        @RequestHeader("X-Auth-Token") String token,
        @PathVariable String projectId,
        @RequestParam(name = "page", defaultValue = "1") int page,
        @RequestParam(name = "size", defaultValue = "10") int size
    ) {
        UserAccount user = authService.requireUser(token);
        ensureAllocationRole(user);
        List<BomLineDto> lines = bomService.listLines(projectId);
        return paginate(lines, page, size);
    }

    // ---- Helpers ----

    /**
     * Sanitize the page number to ensure it is at least 1. Any non‑positive
     * values are mapped to 1.
     */
    private int sanitizePage(int page) {
        return page < 1 ? 1 : page;
    }

    /**
     * Sanitize the page size. If the size is less than 1, a default of 10
     * is used. The size is capped at 100 to prevent excessive payloads.
     */
    private int sanitizeSize(int size) {
        if (size < 1) {
            return 10;
        }
        return Math.min(size, 100);
    }

    /**
     * Produce a paginated response from a list of items. The logic mirrors
     * the pagination helpers found in {@link HistoryController} to ensure
     * consistent behaviour across endpoints. The meta field is left
     * empty.
     */
    private PaginatedResponse<BomLineDto> paginate(List<BomLineDto> items, int page, int size) {
        int safeSize = sanitizeSize(size);
        int safePage = sanitizePage(page);
        int totalItems = items != null ? items.size() : 0;
        int totalPages = totalItems == 0 ? 1 : (int) Math.ceil((double) totalItems / safeSize);
        int fromIndex = Math.max(0, (safePage - 1) * safeSize);
        int toIndex = Math.min(fromIndex + safeSize, totalItems);
        List<BomLineDto> pageItems = fromIndex < toIndex ? items.subList(fromIndex, toIndex) : List.of();
        return new PaginatedResponse<>(
            pageItems,
            totalItems,
            safePage,
            safeSize,
            totalPages,
            safePage < totalPages,
            safePage > 1,
            java.util.Collections.emptyMap()
        );
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
