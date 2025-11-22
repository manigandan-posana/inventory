package com.vebops.store.service;

import com.vebops.store.dto.AppBootstrapResponse;
import com.vebops.store.dto.BomLineDto;
import com.vebops.store.dto.InwardLineDto;
import com.vebops.store.dto.InwardRecordDto;
import com.vebops.store.dto.MaterialDto;
import com.vebops.store.dto.MaterialMovementDto;
import com.vebops.store.dto.OutwardLineDto;
import com.vebops.store.dto.OutwardRegisterDto;
import com.vebops.store.dto.ProcurementRequestDto;
import com.vebops.store.dto.ProjectDto;
import com.vebops.store.dto.TransferLineDto;
import com.vebops.store.dto.TransferRecordDto;
import com.vebops.store.dto.UserDto;
import com.vebops.store.exception.BadRequestException;
import com.vebops.store.model.AccessType;
import com.vebops.store.model.BomLine;
import com.vebops.store.model.InwardLine;
import com.vebops.store.model.InwardRecord;
import com.vebops.store.model.Material;
import com.vebops.store.model.OutwardRegister;
import com.vebops.store.model.Project;
import com.vebops.store.model.TransferRecord;
import com.vebops.store.model.UserAccount;
import com.vebops.store.repository.BomLineRepository;
import com.vebops.store.repository.InwardLineRepository;
import com.vebops.store.repository.InwardRecordRepository;
import com.vebops.store.repository.MaterialRepository;
import com.vebops.store.repository.OutwardLineRepository;
import com.vebops.store.repository.OutwardRegisterRepository;
import com.vebops.store.repository.ProjectRepository;
import com.vebops.store.repository.TransferRecordRepository;
import com.vebops.store.repository.UserRepository;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;

@Service
public class AppDataService {

    private final ProjectRepository projectRepository;
    private final MaterialRepository materialRepository;
    private final BomLineRepository bomLineRepository;
    private final InwardLineRepository inwardLineRepository;
    private final InwardRecordRepository inwardRecordRepository;
    private final OutwardLineRepository outwardLineRepository;
    private final OutwardRegisterRepository outwardRegisterRepository;
    private final TransferRecordRepository transferRecordRepository;
    private final UserRepository userRepository;
    private final AuthService authService;
    private final ProcurementService procurementService;
    private final InventoryService inventoryService;

    private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ISO_LOCAL_DATE;

    public AppDataService(
        ProjectRepository projectRepository,
        MaterialRepository materialRepository,
        BomLineRepository bomLineRepository,
        InwardLineRepository inwardLineRepository,
        InwardRecordRepository inwardRecordRepository,
        OutwardLineRepository outwardLineRepository,
        OutwardRegisterRepository outwardRegisterRepository,
        TransferRecordRepository transferRecordRepository,
        UserRepository userRepository,
        AuthService authService,
        ProcurementService procurementService,
        InventoryService inventoryService
    ) {
        this.projectRepository = projectRepository;
        this.materialRepository = materialRepository;
        this.bomLineRepository = bomLineRepository;
        this.inwardLineRepository = inwardLineRepository;
        this.inwardRecordRepository = inwardRecordRepository;
        this.outwardLineRepository = outwardLineRepository;
        this.outwardRegisterRepository = outwardRegisterRepository;
        this.transferRecordRepository = transferRecordRepository;
        this.userRepository = userRepository;
        this.authService = authService;
        this.procurementService = procurementService;
        this.inventoryService = inventoryService;
    }

    public AppBootstrapResponse bootstrap(UserAccount user) {
        List<Project> allProjects = projectRepository.findAll();
        List<ProjectDto> allProjectDtos = allProjects.stream().map(this::toProjectDto).toList();

        List<Project> assigned = resolveAssignedProjects(user, allProjects);
        List<ProjectDto> assignedDtos = assigned.stream().map(this::toProjectDto).toList();

        List<MaterialDto> materialDtos = materialRepository
            .findAll()
            .stream()
            .sorted(Comparator.comparing(Material::getCode))
            .map(this::toMaterialDto)
            .toList();

        Map<String, List<BomLineDto>> bom = new LinkedHashMap<>();
        for (Project project : allProjects) {
            List<BomLineDto> lines = bomLineRepository
                .findByProjectId(project.getId())
                .stream()
                .map(this::toBomLineDto)
                .toList();
            bom.put(String.valueOf(project.getId()), lines);
        }

        Set<Long> allowedProjectIds = assigned.stream().map(Project::getId).collect(Collectors.toSet());

        List<InwardRecordDto> inward = inwardRecordRepository
            .findAllByOrderByEntryDateDesc()
            .stream()
            .filter(rec -> allowedProjectIds.contains(rec.getProject().getId()))
            .map(this::toInwardRecordDto)
            .toList();

        List<OutwardRegisterDto> outward = outwardRegisterRepository
            .findAllByOrderByDateDesc()
            .stream()
            .filter(reg -> allowedProjectIds.contains(reg.getProject().getId()))
            .map(this::toOutwardDto)
            .toList();

        List<TransferRecordDto> transfers = transferRecordRepository
            .findAllByOrderByTransferDateDesc()
            .stream()
            .filter(rec -> {
                Long fromId = rec.getFromProject() != null ? rec.getFromProject().getId() : null;
                Long toId = rec.getToProject() != null ? rec.getToProject().getId() : null;
                return (fromId != null && allowedProjectIds.contains(fromId)) ||
                    (toId != null && allowedProjectIds.contains(toId));
            })
            .map(this::toTransferDto)
            .toList();

        UserDto userDto = authService.toUserDto(user);

        List<ProcurementRequestDto> procurementRequests = procurementService.listRequests(user);

        return new AppBootstrapResponse(
            userDto,
            allProjectDtos,
            assignedDtos,
            bom,
            materialDtos,
            inward,
            outward,
            transfers,
            procurementRequests,
            inventoryService.generateCodes()
        );
    }

    public List<InwardRecordDto> materialInwardHistory(UserAccount user, Long materialId) {
        if (materialId == null) {
            throw new BadRequestException("Material id is required");
        }
        List<Project> allProjects = projectRepository.findAll();
        List<Project> assigned = resolveAssignedProjects(user, allProjects);
        Set<Long> allowedProjectIds = assigned.stream().map(Project::getId).collect(Collectors.toSet());

        return inwardRecordRepository
            .findByLinesMaterialIdOrderByEntryDateDesc(materialId)
            .stream()
            .filter(rec -> allowedProjectIds.contains(rec.getProject().getId()))
            .map(rec -> toInwardRecordDto(rec, materialId))
            .toList();
    }

    public MaterialMovementDto materialMovementHistory(UserAccount user, Long materialId) {
        if (materialId == null) {
            throw new BadRequestException("Material id is required");
        }
        List<Project> allProjects = projectRepository.findAll();
        List<Project> assigned = resolveAssignedProjects(user, allProjects);
        Set<Long> allowedProjectIds = assigned.stream().map(Project::getId).collect(Collectors.toSet());

        List<InwardRecordDto> inwards = inwardRecordRepository
            .findByLinesMaterialIdOrderByEntryDateDesc(materialId)
            .stream()
            .filter(rec -> allowedProjectIds.contains(rec.getProject().getId()))
            .map(rec -> toInwardRecordDto(rec, materialId))
            .toList();

        List<OutwardRegisterDto> outwards = outwardRegisterRepository
            .findByLinesMaterialIdOrderByDateDesc(materialId)
            .stream()
            .filter(reg -> allowedProjectIds.contains(reg.getProject().getId()))
            .map(reg -> toOutwardDto(reg, materialId))
            .toList();

        return new MaterialMovementDto(inwards, outwards);
    }

    private List<Project> resolveAssignedProjects(UserAccount user, List<Project> allProjects) {
        if (user.getAccessType() == AccessType.ALL) {
            return allProjects;
        }
        return new ArrayList<>(user.getProjects());
    }

    private ProjectDto toProjectDto(Project project) {
        return new ProjectDto(String.valueOf(project.getId()), project.getCode(), project.getName());
    }

    private MaterialDto toMaterialDto(Material material) {
        return new MaterialDto(
            String.valueOf(material.getId()),
            material.getCode(),
            material.getName(),
            material.getPartNo(),
            material.getLineType(),
            material.getUnit(),
            material.getCategory(),
            material.getRequiredQty(),
            material.getOrderedQty(),
            material.getReceivedQty(),
            material.getUtilizedQty(),
            material.getBalanceQty()
        );
    }

    private BomLineDto toBomLineDto(BomLine line) {
        Material material = line.getMaterial();
        Project project = line.getProject();
        ProjectMaterialTotals totals = project != null && material != null
            ? computeProjectMaterialTotals(project.getId(), material.getId())
            : new ProjectMaterialTotals(0d, 0d, 0d, 0d);
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
            line.getQuantity(),
            line.getQuantity(),
            totals.orderedQty(),
            totals.receivedQty(),
            totals.issuedQty(),
            totals.balanceQty()
        );
    }

    private ProjectMaterialTotals computeProjectMaterialTotals(Long projectId, Long materialId) {
        double orderedQty = safeDouble(
            inwardLineRepository.sumOrderedQtyByProjectAndMaterial(projectId, materialId)
        );
        double receivedQty = safeDouble(
            inwardLineRepository.sumReceivedQtyByProjectAndMaterial(projectId, materialId)
        );
        double issuedQty = safeDouble(
            outwardLineRepository.sumIssuedQtyByProjectAndMaterial(projectId, materialId)
        );
        double balanceQty = Math.max(0d, receivedQty - issuedQty);
        return new ProjectMaterialTotals(orderedQty, receivedQty, issuedQty, balanceQty);
    }

    private double safeDouble(Double value) {
        return value != null ? value : 0d;
    }

    private record ProjectMaterialTotals(double orderedQty, double receivedQty, double issuedQty, double balanceQty) {}

    private InwardRecordDto toInwardRecordDto(InwardRecord record) {
        return toInwardRecordDto(record, null);
    }

    private InwardRecordDto toInwardRecordDto(InwardRecord record, Long materialFilterId) {
        List<InwardLineDto> lines = record
            .getLines()
            .stream()
            .filter(line -> materialFilterId == null || (line.getMaterial() != null && materialFilterId.equals(line.getMaterial().getId())))
            .map(this::toInwardLineDto)
            .toList();
        return new InwardRecordDto(
            String.valueOf(record.getId()),
            String.valueOf(record.getProject().getId()),
            record.getProject() != null ? record.getProject().getName() : null,
            record.getCode(),
            record.getEntryDate() != null ? DATE_FMT.format(record.getEntryDate()) : null,
            record.getDeliveryDate() != null ? DATE_FMT.format(record.getDeliveryDate()) : null,
            record.getInvoiceNo(),
            record.getSupplierName(),
            lines.size(),
            lines
        );
    }

    private InwardLineDto toInwardLineDto(InwardLine line) {
        return new InwardLineDto(
            String.valueOf(line.getId()),
            line.getMaterial() != null ? String.valueOf(line.getMaterial().getId()) : null,
            line.getMaterial() != null ? line.getMaterial().getCode() : null,
            line.getMaterial() != null ? line.getMaterial().getName() : null,
            line.getMaterial() != null ? line.getMaterial().getUnit() : null,
            line.getOrderedQty(),
            line.getReceivedQty()
        );
    }

    private OutwardRegisterDto toOutwardDto(OutwardRegister register) {
        return toOutwardDto(register, null);
    }

    private OutwardRegisterDto toOutwardDto(OutwardRegister register, Long materialFilterId) {
        List<OutwardLineDto> lines = register
            .getLines()
            .stream()
            .filter(line ->
                materialFilterId == null
                    || (line.getMaterial() != null && materialFilterId.equals(line.getMaterial().getId()))
            )
            .map(line -> new OutwardLineDto(
                String.valueOf(line.getId()),
                line.getMaterial() != null ? String.valueOf(line.getMaterial().getId()) : null,
                line.getMaterial() != null ? line.getMaterial().getCode() : null,
                line.getMaterial() != null ? line.getMaterial().getName() : null,
                line.getMaterial() != null ? line.getMaterial().getUnit() : null,
                line.getIssueQty()
            ))
            .toList();

        return new OutwardRegisterDto(
            String.valueOf(register.getId()),
            String.valueOf(register.getProject().getId()),
            register.getProject() != null ? register.getProject().getName() : null,
            register.getCode(),
            register.getDate() != null ? DATE_FMT.format(register.getDate()) : null,
            register.getIssueTo(),
            register.getStatus().name(),
            register.getCloseDate() != null ? DATE_FMT.format(register.getCloseDate()) : null,
            lines.size(),
            lines
        );
    }

    private TransferRecordDto toTransferDto(TransferRecord record) {
        return new TransferRecordDto(
            String.valueOf(record.getId()),
            record.getCode(),
            record.getFromProject() != null ? String.valueOf(record.getFromProject().getId()) : null,
            record.getFromProject() != null ? record.getFromProject().getName() : null,
            record.getFromSite(),
            record.getToProject() != null ? String.valueOf(record.getToProject().getId()) : null,
            record.getToProject() != null ? record.getToProject().getName() : null,
            record.getToSite(),
            record.getTransferDate() != null ? DATE_FMT.format(record.getTransferDate()) : null,
            record.getRemarks(),
            record
                .getLines()
                .stream()
                .map(line -> new TransferLineDto(
                    String.valueOf(line.getId()),
                    line.getMaterial() != null ? String.valueOf(line.getMaterial().getId()) : null,
                    line.getMaterial() != null ? line.getMaterial().getCode() : null,
                    line.getMaterial() != null ? line.getMaterial().getName() : null,
                    line.getMaterial() != null ? line.getMaterial().getUnit() : null,
                    line.getTransferQty()
                ))
                .toList()
        );
    }
}
