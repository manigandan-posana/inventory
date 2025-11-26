package com.vebops.store.service;

import com.vebops.store.dto.CreateProcurementRequest;
import com.vebops.store.dto.ProcurementRequestDto;
import com.vebops.store.dto.ResolveProcurementRequest;
import com.vebops.store.exception.BadRequestException;
import com.vebops.store.exception.NotFoundException;
import com.vebops.store.exception.UnauthorizedException;
import com.vebops.store.model.AccessType;
import com.vebops.store.model.Material;
import com.vebops.store.model.ProcurementRequest;
import com.vebops.store.model.ProcurementRequestStatus;
import com.vebops.store.model.Project;
import com.vebops.store.model.UserAccount;
import com.vebops.store.repository.MaterialRepository;
import com.vebops.store.repository.ProcurementRequestRepository;
import com.vebops.store.repository.ProjectRepository;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Service
public class ProcurementService {

    private final ProjectRepository projectRepository;
    private final MaterialRepository materialRepository;
    private final ProcurementRequestRepository procurementRequestRepository;
    private final BomService bomService;

    private static final DateTimeFormatter DATE_TIME_FMT = DateTimeFormatter.ISO_LOCAL_DATE_TIME;

    public ProcurementService(
        ProjectRepository projectRepository,
        MaterialRepository materialRepository,
        ProcurementRequestRepository procurementRequestRepository,
        BomService bomService
    ) {
        this.projectRepository = projectRepository;
        this.materialRepository = materialRepository;
        this.procurementRequestRepository = procurementRequestRepository;
        this.bomService = bomService;
    }

    public List<ProcurementRequestDto> listRequests(UserAccount user) {
        List<ProcurementRequest> requests;
        if (canReview(user)) {
            requests = procurementRequestRepository.findAllByOrderByCreatedAtDesc();
        } else {
            requests = procurementRequestRepository.findByRequestedByIdOrderByCreatedAtDesc(user.getId());
        }
        return requests.stream().map(this::toDto).toList();
    }

    @Transactional
    public ProcurementRequestDto createRequest(UserAccount user, CreateProcurementRequest payload) {
        if (payload == null) {
            throw new BadRequestException("Request payload is required");
        }
        if (!StringUtils.hasText(payload.projectId()) || !StringUtils.hasText(payload.materialId())) {
            throw new BadRequestException("Project and material are required");
        }
        if (payload.increaseQty() <= 0) {
            throw new BadRequestException("Increase quantity must be greater than zero");
        }
        if (!StringUtils.hasText(payload.reason())) {
            throw new BadRequestException("Reason is required");
        }
        Project project = projectRepository
            .findById(Long.valueOf(payload.projectId().trim()))
            .orElseThrow(() -> new NotFoundException("Project not found"));
        ensureProjectAccess(user, project);
        Material material = materialRepository
            .findById(Long.valueOf(payload.materialId().trim()))
            .orElseThrow(() -> new NotFoundException("Material not found"));

        ProcurementRequest request = new ProcurementRequest();
        request.setProject(project);
        request.setMaterial(material);
        request.setRequestedBy(user);
        request.setCapturedRequiredQty(bomService.currentAllocation(project, material));
        request.setRequestedIncrease(payload.increaseQty());
        request.setReason(payload.reason().trim());
        request.setStatus(ProcurementRequestStatus.PENDING);
        request.setCreatedAt(LocalDateTime.now());

        return toDto(procurementRequestRepository.save(request));
    }

    @Transactional
    public ProcurementRequestDto resolveRequest(UserAccount actor, Long requestId, ResolveProcurementRequest payload) {
        if (!canReview(actor)) {
            throw new UnauthorizedException("Only procurement manager, admin, CEO or COO can resolve requests");
        }
        ProcurementRequest request = procurementRequestRepository
            .findById(requestId)
            .orElseThrow(() -> new NotFoundException("Request not found"));
        if (request.getStatus() != ProcurementRequestStatus.PENDING) {
            throw new BadRequestException("Request already processed");
        }
        if (payload == null || !StringUtils.hasText(payload.decision())) {
            throw new BadRequestException("Decision is required");
        }
        ProcurementRequestStatus decision;
        try {
            decision = ProcurementRequestStatus.valueOf(payload.decision().toUpperCase());
        } catch (IllegalArgumentException ex) {
            throw new BadRequestException("Decision must be APPROVED or REJECTED");
        }

        if (decision == ProcurementRequestStatus.APPROVED) {
            double base = bomService.currentAllocation(request.getProject(), request.getMaterial());
            double updated = base + request.getRequestedIncrease();
            bomService.upsertLine(request.getProject(), request.getMaterial(), updated);
            request.setResolvedRequiredQty(updated);
        } else if (decision == ProcurementRequestStatus.REJECTED) {
            request.setResolvedRequiredQty(bomService.currentAllocation(request.getProject(), request.getMaterial()));
        }
        request.setStatus(decision);
        request.setResolvedBy(actor);
        request.setResolvedAt(LocalDateTime.now());
        if (StringUtils.hasText(payload.note())) {
            request.setResolutionNote(payload.note().trim());
        }
        return toDto(procurementRequestRepository.save(request));
    }

    private void ensureProjectAccess(UserAccount user, Project project) {
        if (user.getAccessType() == AccessType.ALL) {
            return;
        }
        boolean assigned = user
            .getProjects()
            .stream()
            .anyMatch(assignedProject -> assignedProject.getId().equals(project.getId()));
        if (!assigned) {
            throw new UnauthorizedException("You are not assigned to this project");
        }
    }

    private boolean canReview(UserAccount user) {
        if (user == null || user.getRole() == null) {
            return false;
        }
        return switch (user.getRole()) {
            case ADMIN, CEO, COO, PROCUREMENT_MANAGER -> true;
            default -> false;
        };
    }

    private ProcurementRequestDto toDto(ProcurementRequest request) {
        String requestedAt = request.getCreatedAt() != null ? DATE_TIME_FMT.format(request.getCreatedAt()) : null;
        String resolvedAt = request.getResolvedAt() != null ? DATE_TIME_FMT.format(request.getResolvedAt()) : null;
        return new ProcurementRequestDto(
            String.valueOf(request.getId()),
            request.getProject() != null ? String.valueOf(request.getProject().getId()) : null,
            request.getProject() != null ? request.getProject().getCode() : null,
            request.getProject() != null ? request.getProject().getName() : null,
            request.getMaterial() != null ? String.valueOf(request.getMaterial().getId()) : null,
            request.getMaterial() != null ? request.getMaterial().getCode() : null,
            request.getMaterial() != null ? request.getMaterial().getName() : null,
            request.getMaterial() != null ? request.getMaterial().getUnit() : null,
            request.getCapturedRequiredQty(),
            request.getRequestedIncrease(),
            request.getCapturedRequiredQty() + request.getRequestedIncrease(),
            request.getResolvedRequiredQty(),
            request.getReason(),
            request.getStatus() != null ? request.getStatus().name() : null,
            request.getRequestedBy() != null ? request.getRequestedBy().getName() : null,
            request.getRequestedBy() != null && request.getRequestedBy().getRole() != null
                ? request.getRequestedBy().getRole().name()
                : null,
            requestedAt,
            request.getResolvedBy() != null ? request.getResolvedBy().getName() : null,
            request.getResolvedBy() != null && request.getResolvedBy().getRole() != null
                ? request.getResolvedBy().getRole().name()
                : null,
            resolvedAt,
            request.getResolutionNote()
        );
    }
}
