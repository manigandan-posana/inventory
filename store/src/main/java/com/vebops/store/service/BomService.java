package com.vebops.store.service;

import com.vebops.store.dto.BomLineDto;
import com.vebops.store.exception.BadRequestException;
import com.vebops.store.exception.NotFoundException;
import com.vebops.store.model.BomLine;
import com.vebops.store.model.Material;
import com.vebops.store.model.Project;
import com.vebops.store.repository.BomLineRepository;
import com.vebops.store.repository.InwardLineRepository;
import com.vebops.store.repository.MaterialRepository;
import com.vebops.store.repository.OutwardLineRepository;
import com.vebops.store.repository.ProjectRepository;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

@Service
public class BomService {

    private final BomLineRepository bomLineRepository;
    private final ProjectRepository projectRepository;
    private final MaterialRepository materialRepository;
    private final InwardLineRepository inwardLineRepository;
    private final OutwardLineRepository outwardLineRepository;

    public BomService(
        BomLineRepository bomLineRepository,
        ProjectRepository projectRepository,
        MaterialRepository materialRepository,
        InwardLineRepository inwardLineRepository,
        OutwardLineRepository outwardLineRepository
    ) {
        this.bomLineRepository = bomLineRepository;
        this.projectRepository = projectRepository;
        this.materialRepository = materialRepository;
        this.inwardLineRepository = inwardLineRepository;
        this.outwardLineRepository = outwardLineRepository;
    }

    public BomLineDto assignQuantity(String projectId, String materialId, double quantity) {
        if (quantity < 0) {
            throw new BadRequestException("Quantity must be zero or greater");
        }
        Project project = requireProject(projectId);
        Material material = requireMaterial(materialId);
        BomLine line = upsertLine(project, material, quantity);
        return toDto(line);
    }

    public List<BomLineDto> listLines(String projectId) {
        Project project = requireProject(projectId);
        return bomLineRepository.findByProjectId(project.getId()).stream().map(this::toDto).toList();
    }

    public BomLine upsertLine(Project project, Material material, double quantity) {
        if (quantity < 0) {
            throw new BadRequestException("Quantity must be zero or greater");
        }
        BomLine line = bomLineRepository
            .findByProjectIdAndMaterialId(project.getId(), material.getId())
            .orElseGet(() -> {
                BomLine created = new BomLine();
                created.setProject(project);
                created.setMaterial(material);
                return created;
            });
        line.setQuantity(quantity);
        return bomLineRepository.save(line);
    }

    public void deleteLine(String projectId, String materialId) {
        Project project = requireProject(projectId);
        Material material = requireMaterial(materialId);
        bomLineRepository.deleteByProjectIdAndMaterialId(project.getId(), material.getId());
    }

    public double currentAllocation(Long projectId, Long materialId) {
        return bomLineRepository
            .findByProjectIdAndMaterialId(projectId, materialId)
            .map(BomLine::getQuantity)
            .orElse(0d);
    }

    public double currentAllocation(Project project, Material material) {
        if (project == null || material == null) {
            return 0d;
        }
        return currentAllocation(project.getId(), material.getId());
    }

    private Project requireProject(String id) {
        return projectRepository.findById(parseLong(id)).orElseThrow(() -> new NotFoundException("Project not found"));
    }

    private Material requireMaterial(String id) {
        return materialRepository.findById(parseLong(id)).orElseThrow(() -> new NotFoundException("Material not found"));
    }

    private Long parseLong(String value) {
        if (!StringUtils.hasText(value)) {
            throw new BadRequestException("Identifier is required");
        }
        return Long.parseLong(value);
    }

    private BomLineDto toDto(BomLine line) {
        Material material = line.getMaterial();
        Project project = line.getProject();
        double allocation = line.getQuantity();
        double orderedQty = safeDouble(
            inwardLineRepository.sumOrderedQtyByProjectAndMaterial(project.getId(), material.getId())
        );
        double receivedQty = safeDouble(
            inwardLineRepository.sumReceivedQtyByProjectAndMaterial(project.getId(), material.getId())
        );
        double issuedQty = safeDouble(
            outwardLineRepository.sumIssuedQtyByProjectAndMaterial(project.getId(), material.getId())
        );
        double balanceQty = Math.max(0d, receivedQty - issuedQty);
        return new BomLineDto(
            line.getId() != null ? String.valueOf(line.getId()) : null,
            project != null && project.getId() != null ? String.valueOf(project.getId()) : null,
            material != null && material.getId() != null ? String.valueOf(material.getId()) : null,
            material != null ? material.getCode() : null,
            material != null ? material.getName() : null,
            material != null ? material.getPartNo() : null,
            material != null ? material.getLineType() : null,
            material != null ? material.getUnit() : null,
            material != null ? material.getCategory() : null,
            allocation,
            allocation,
            orderedQty,
            receivedQty,
            issuedQty,
            balanceQty
        );
    }

    private double safeDouble(Double value) {
        return value != null ? value : 0d;
    }
}
