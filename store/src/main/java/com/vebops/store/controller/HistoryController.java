package com.vebops.store.controller;

import com.vebops.store.dto.InwardRecordDto;
import com.vebops.store.dto.OutwardRegisterDto;
import com.vebops.store.dto.PaginatedResponse;
import com.vebops.store.dto.TransferRecordDto;
import com.vebops.store.model.AccessType;
import com.vebops.store.model.InwardLine;
import com.vebops.store.model.InwardRecord;
import com.vebops.store.model.Material;
import com.vebops.store.model.OutwardLine;
import com.vebops.store.model.OutwardRegister;
import com.vebops.store.model.Project;
import com.vebops.store.model.TransferLine;
import com.vebops.store.model.TransferRecord;
import com.vebops.store.model.UserAccount;
import com.vebops.store.repository.InwardRecordRepository;
import com.vebops.store.repository.OutwardRegisterRepository;
import com.vebops.store.repository.ProjectRepository;
import com.vebops.store.repository.TransferRecordRepository;
import com.vebops.store.service.AuthService;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Controller providing paginated history endpoints for inwards, outwards and transfers.
 *
 * These endpoints move pagination and filtering logic from the frontend to the backend.
 * They accept optional page/size parameters and will automatically clamp values to
 * sensible ranges. Only records from projects that the current user has access to
 * (based on their AccessType and assigned projects) are returned.
 */
@RestController
@RequestMapping("/api/history")
public class HistoryController {

    private final AuthService authService;
    private final ProjectRepository projectRepository;
    private final InwardRecordRepository inwardRecordRepository;
    private final OutwardRegisterRepository outwardRegisterRepository;
    private final TransferRecordRepository transferRecordRepository;

    private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ISO_LOCAL_DATE;

    public HistoryController(
        AuthService authService,
        ProjectRepository projectRepository,
        InwardRecordRepository inwardRecordRepository,
        OutwardRegisterRepository outwardRegisterRepository,
        TransferRecordRepository transferRecordRepository
    ) {
        this.authService = authService;
        this.projectRepository = projectRepository;
        this.inwardRecordRepository = inwardRecordRepository;
        this.outwardRegisterRepository = outwardRegisterRepository;
        this.transferRecordRepository = transferRecordRepository;
    }

    /**
     * Returns paginated inward record history for the current user. Records are ordered by
     * entry date descending. Optional page/size parameters determine which subset of results
     * to return.
     *
     * @param token the authentication token
     * @param page 1‑based page number (defaults to 1 if invalid)
     * @param size maximum number of items per page (capped between 1 and 100, defaults to 10)
     * @return a paginated response containing inward record DTOs
     */
    @GetMapping("/inwards")
    public PaginatedResponse<InwardRecordDto> getInwards(
        @RequestHeader("X-Auth-Token") String token,
        @RequestParam(name = "page", defaultValue = "1") int page,
        @RequestParam(name = "size", defaultValue = "10") int size
    ) {
        UserAccount user = authService.requireUser(token);
        List<InwardRecordDto> allowed = filterInwardsByUser(user);
        return paginateInwards(allowed, page, size);
    }

    /**
     * Returns paginated outward register history for the current user. Records are ordered by
     * register date descending. Optional page/size parameters determine which subset of results
     * to return.
     *
     * @param token the authentication token
     * @param page 1‑based page number (defaults to 1 if invalid)
     * @param size maximum number of items per page (capped between 1 and 100, defaults to 10)
     * @return a paginated response containing outward register DTOs
     */
    @GetMapping("/outwards")
    public PaginatedResponse<OutwardRegisterDto> getOutwards(
        @RequestHeader("X-Auth-Token") String token,
        @RequestParam(name = "page", defaultValue = "1") int page,
        @RequestParam(name = "size", defaultValue = "10") int size
    ) {
        UserAccount user = authService.requireUser(token);
        List<OutwardRegisterDto> allowed = filterOutwardsByUser(user);
        return paginateOutwards(allowed, page, size);
    }

    /**
     * Returns paginated transfer record history for the current user. Records are ordered by
     * transfer date descending. Optional page/size parameters determine which subset of results
     * to return.
     *
     * @param token the authentication token
     * @param page 1‑based page number (defaults to 1 if invalid)
     * @param size maximum number of items per page (capped between 1 and 100, defaults to 10)
     * @return a paginated response containing transfer record DTOs
     */
    @GetMapping("/transfers")
    public PaginatedResponse<TransferRecordDto> getTransfers(
        @RequestHeader("X-Auth-Token") String token,
        @RequestParam(name = "page", defaultValue = "1") int page,
        @RequestParam(name = "size", defaultValue = "10") int size
    ) {
        UserAccount user = authService.requireUser(token);
        List<TransferRecordDto> allowed = filterTransfersByUser(user);
        return paginateTransfers(allowed, page, size);
    }

    // ---- Helpers ----

    private List<InwardRecordDto> filterInwardsByUser(UserAccount user) {
        List<InwardRecord> all = inwardRecordRepository.findAllByOrderByEntryDateDesc();
        Set<Long> allowedProjectIds = resolveAllowedProjectIds(user);
        if (allowedProjectIds.isEmpty()) {
            return Collections.emptyList();
        }
        List<InwardRecordDto> dtos = new ArrayList<>();
        for (InwardRecord record : all) {
            Project project = record.getProject();
            if (project != null && allowedProjectIds.contains(project.getId())) {
                dtos.add(toInwardRecordDto(record));
            }
        }
        return dtos;
    }

    private List<OutwardRegisterDto> filterOutwardsByUser(UserAccount user) {
        List<OutwardRegister> all = outwardRegisterRepository.findAllByOrderByDateDesc();
        Set<Long> allowedProjectIds = resolveAllowedProjectIds(user);
        if (allowedProjectIds.isEmpty()) {
            return Collections.emptyList();
        }
        List<OutwardRegisterDto> dtos = new ArrayList<>();
        for (OutwardRegister reg : all) {
            Project project = reg.getProject();
            if (project != null && allowedProjectIds.contains(project.getId())) {
                dtos.add(toOutwardRegisterDto(reg));
            }
        }
        return dtos;
    }

    private List<TransferRecordDto> filterTransfersByUser(UserAccount user) {
        List<TransferRecord> all = transferRecordRepository.findAllByOrderByTransferDateDesc();
        Set<Long> allowedProjectIds = resolveAllowedProjectIds(user);
        if (allowedProjectIds.isEmpty()) {
            return Collections.emptyList();
        }
        List<TransferRecordDto> dtos = new ArrayList<>();
        for (TransferRecord record : all) {
            Long fromId = record.getFromProject() != null ? record.getFromProject().getId() : null;
            Long toId = record.getToProject() != null ? record.getToProject().getId() : null;
            boolean allowed = (fromId != null && allowedProjectIds.contains(fromId)) ||
                (toId != null && allowedProjectIds.contains(toId));
            if (allowed) {
                dtos.add(toTransferRecordDto(record));
            }
        }
        return dtos;
    }

    private Set<Long> resolveAllowedProjectIds(UserAccount user) {
        // Users with ALL access can see all projects
        if (user.getAccessType() == AccessType.ALL) {
            return projectRepository
                .findAll()
                .stream()
                .map(Project::getId)
                .collect(Collectors.toSet());
        }
        return user
            .getProjects()
            .stream()
            .map(Project::getId)
            .collect(Collectors.toSet());
    }

    private PaginatedResponse<InwardRecordDto> paginateInwards(List<InwardRecordDto> items, int page, int size) {
        int safeSize = sanitizeSize(size);
        int safePage = sanitizePage(page);
        int totalItems = items != null ? items.size() : 0;
        int totalPages = totalItems == 0 ? 1 : (int) Math.ceil((double) totalItems / safeSize);
        int fromIndex = Math.max(0, (safePage - 1) * safeSize);
        int toIndex = Math.min(fromIndex + safeSize, totalItems);
        List<InwardRecordDto> pageItems = fromIndex < toIndex ? items.subList(fromIndex, toIndex) : List.of();
        return new PaginatedResponse<>(
            pageItems,
            totalItems,
            safePage,
            safeSize,
            totalPages,
            safePage < totalPages,
            safePage > 1,
            Collections.emptyMap()
        );
    }

    private PaginatedResponse<OutwardRegisterDto> paginateOutwards(List<OutwardRegisterDto> items, int page, int size) {
        int safeSize = sanitizeSize(size);
        int safePage = sanitizePage(page);
        int totalItems = items != null ? items.size() : 0;
        int totalPages = totalItems == 0 ? 1 : (int) Math.ceil((double) totalItems / safeSize);
        int fromIndex = Math.max(0, (safePage - 1) * safeSize);
        int toIndex = Math.min(fromIndex + safeSize, totalItems);
        List<OutwardRegisterDto> pageItems = fromIndex < toIndex ? items.subList(fromIndex, toIndex) : List.of();
        return new PaginatedResponse<>(
            pageItems,
            totalItems,
            safePage,
            safeSize,
            totalPages,
            safePage < totalPages,
            safePage > 1,
            Collections.emptyMap()
        );
    }

    private PaginatedResponse<TransferRecordDto> paginateTransfers(List<TransferRecordDto> items, int page, int size) {
        int safeSize = sanitizeSize(size);
        int safePage = sanitizePage(page);
        int totalItems = items != null ? items.size() : 0;
        int totalPages = totalItems == 0 ? 1 : (int) Math.ceil((double) totalItems / safeSize);
        int fromIndex = Math.max(0, (safePage - 1) * safeSize);
        int toIndex = Math.min(fromIndex + safeSize, totalItems);
        List<TransferRecordDto> pageItems = fromIndex < toIndex ? items.subList(fromIndex, toIndex) : List.of();
        return new PaginatedResponse<>(
            pageItems,
            totalItems,
            safePage,
            safeSize,
            totalPages,
            safePage < totalPages,
            safePage > 1,
            Collections.emptyMap()
        );
    }

    private int sanitizePage(int page) {
        return page <= 0 ? 1 : page;
    }

    private int sanitizeSize(int size) {
        if (size <= 0) {
            return 10;
        }
        return Math.min(size, 100);
    }

    // Mapping functions to DTOs. These mirror logic in AppDataService but are redefined here
    // because AppDataService methods are private.
    private InwardRecordDto toInwardRecordDto(InwardRecord record) {
        // Map lines
        List<com.vebops.store.dto.InwardLineDto> lines = new ArrayList<>();
        for (InwardLine line : record.getLines()) {
            Material mat = line.getMaterial();
            lines.add(new com.vebops.store.dto.InwardLineDto(
                String.valueOf(line.getId()),
                mat != null && mat.getId() != null ? String.valueOf(mat.getId()) : null,
                mat != null ? mat.getCode() : null,
                mat != null ? mat.getName() : null,
                mat != null ? mat.getUnit() : null,
                line.getOrderedQty(),
                line.getReceivedQty()
            ));
        }
        Project project = record.getProject();
        return new InwardRecordDto(
            record.getId() != null ? String.valueOf(record.getId()) : null,
            project != null && project.getId() != null ? String.valueOf(project.getId()) : null,
            project != null ? project.getName() : null,
            record.getCode(),
            record.getEntryDate() != null ? DATE_FMT.format(record.getEntryDate()) : null,
            record.getDeliveryDate() != null ? DATE_FMT.format(record.getDeliveryDate()) : null,
            record.getInvoiceNo(),
            record.getSupplierName(),
            lines.size(),
            lines
        );
    }

    private OutwardRegisterDto toOutwardRegisterDto(OutwardRegister register) {
        // Map lines
        List<com.vebops.store.dto.OutwardLineDto> lines = new ArrayList<>();
        for (OutwardLine line : register.getLines()) {
            Material mat = line.getMaterial();
            lines.add(new com.vebops.store.dto.OutwardLineDto(
                String.valueOf(line.getId()),
                mat != null && mat.getId() != null ? String.valueOf(mat.getId()) : null,
                mat != null ? mat.getCode() : null,
                mat != null ? mat.getName() : null,
                mat != null ? mat.getUnit() : null,
                line.getIssueQty()
            ));
        }
        Project project = register.getProject();
        return new OutwardRegisterDto(
            register.getId() != null ? String.valueOf(register.getId()) : null,
            project != null && project.getId() != null ? String.valueOf(project.getId()) : null,
            project != null ? project.getName() : null,
            register.getCode(),
            register.getDate() != null ? DATE_FMT.format(register.getDate()) : null,
            register.getIssueTo(),
            register.getStatus() != null ? register.getStatus().name() : null,
            register.getCloseDate() != null ? DATE_FMT.format(register.getCloseDate()) : null,
            lines.size(),
            lines
        );
    }

    private TransferRecordDto toTransferRecordDto(TransferRecord record) {
        // Map lines
        List<com.vebops.store.dto.TransferLineDto> lines = new ArrayList<>();
        for (TransferLine line : record.getLines()) {
            Material mat = line.getMaterial();
            lines.add(new com.vebops.store.dto.TransferLineDto(
                String.valueOf(line.getId()),
                mat != null && mat.getId() != null ? String.valueOf(mat.getId()) : null,
                mat != null ? mat.getCode() : null,
                mat != null ? mat.getName() : null,
                mat != null ? mat.getUnit() : null,
                line.getTransferQty()
            ));
        }
        Project from = record.getFromProject();
        Project to = record.getToProject();
        return new TransferRecordDto(
            record.getId() != null ? String.valueOf(record.getId()) : null,
            record.getCode(),
            from != null && from.getId() != null ? String.valueOf(from.getId()) : null,
            from != null ? from.getName() : null,
            record.getFromSite(),
            to != null && to.getId() != null ? String.valueOf(to.getId()) : null,
            to != null ? to.getName() : null,
            record.getToSite(),
            record.getTransferDate() != null ? DATE_FMT.format(record.getTransferDate()) : null,
            record.getRemarks(),
            lines
        );
    }
}