package com.vebops.store.service;

import com.vebops.store.dto.InventoryCodesResponse;
import com.vebops.store.dto.InwardLineRequest;
import com.vebops.store.dto.InwardRequest;
import com.vebops.store.dto.OutwardLineRequest;
import com.vebops.store.dto.OutwardRequest;
import com.vebops.store.dto.OutwardUpdateRequest;
import com.vebops.store.dto.TransferRequest;
import com.vebops.store.exception.BadRequestException;
import com.vebops.store.exception.NotFoundException;
import com.vebops.store.model.BomLine;
import com.vebops.store.model.InwardLine;
import com.vebops.store.model.InwardRecord;
import com.vebops.store.model.InwardType;
import com.vebops.store.model.Material;
import com.vebops.store.model.OutwardLine;
import com.vebops.store.model.OutwardRegister;
import com.vebops.store.model.OutwardStatus;
import com.vebops.store.model.Project;
import com.vebops.store.model.TransferLine;
import com.vebops.store.model.TransferRecord;
import com.vebops.store.repository.BomLineRepository;
import com.vebops.store.repository.InwardLineRepository;
import com.vebops.store.repository.InwardRecordRepository;
import com.vebops.store.repository.MaterialRepository;
import com.vebops.store.repository.OutwardLineRepository;
import com.vebops.store.repository.OutwardRegisterRepository;
import com.vebops.store.repository.ProjectRepository;
import com.vebops.store.repository.TransferRecordRepository;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Supplier;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;


@Service
public class InventoryService {

    private final ProjectRepository projectRepository;
    private final MaterialRepository materialRepository;
    private final InwardRecordRepository inwardRecordRepository;
    private final OutwardRegisterRepository outwardRegisterRepository;
    private final TransferRecordRepository transferRecordRepository;
    private final BomLineRepository bomLineRepository;
    private final InwardLineRepository inwardLineRepository;
    private final OutwardLineRepository outwardLineRepository;

    private static final DateTimeFormatter CODE_DATE = DateTimeFormatter.BASIC_ISO_DATE;

    public InventoryService(
        ProjectRepository projectRepository,
        MaterialRepository materialRepository,
        InwardRecordRepository inwardRecordRepository,
        OutwardRegisterRepository outwardRegisterRepository,
        TransferRecordRepository transferRecordRepository,
        BomLineRepository bomLineRepository,
        InwardLineRepository inwardLineRepository,
        OutwardLineRepository outwardLineRepository
    ) {
        this.projectRepository = projectRepository;
        this.materialRepository = materialRepository;
        this.inwardRecordRepository = inwardRecordRepository;
        this.outwardRegisterRepository = outwardRegisterRepository;
        this.transferRecordRepository = transferRecordRepository;
        this.bomLineRepository = bomLineRepository;
        this.inwardLineRepository = inwardLineRepository;
        this.outwardLineRepository = outwardLineRepository;
    }

    public InventoryCodesResponse generateCodes() {
        LocalDate today = LocalDate.now();
        return new InventoryCodesResponse(
            buildDailyCode("INW", today, inwardRecordRepository.countByEntryDate(today) + 1),
            buildDailyCode("OUT", today, outwardRegisterRepository.countByDate(today) + 1),
            buildDailyCode("TRF", today, transferRecordRepository.countByTransferDate(today) + 1)
        );
    }

    @Transactional
    public void registerInward(InwardRequest request) {
        Project project = requireProject(request.projectId());
        if (request.lines() == null || request.lines().isEmpty()) {
            throw new BadRequestException("At least one inward line is required");
        }

        InwardRecord record = new InwardRecord();
        record.setCode(resolveOrGenerateCode(request.code(), () -> generateCodes().inwardCode()));
        record.setProject(project);
        record.setType(
            StringUtils.hasText(request.type())
                ? InwardType.valueOf(request.type())
                : InwardType.SUPPLY
        );
        record.setInvoiceNo(request.invoiceNo());
        record.setInvoiceDate(parseDate(request.invoiceDate()));
        record.setDeliveryDate(parseDate(request.deliveryDate()));
        record.setVehicleNo(request.vehicleNo());
        record.setRemarks(request.remarks());
        record.setSupplierName(request.supplierName());
        record.setEntryDate(
            record.getDeliveryDate() != null ? record.getDeliveryDate() : LocalDate.now()
        );

        List<InwardLine> lines = new ArrayList<>();

        // Track quantities for this request so we don't over-count same-material lines
        Map<Long, Double> pendingReceivedByMaterial = new HashMap<>();
        Map<Long, Double> pendingOrderedByMaterial = new HashMap<>();

        request.lines().forEach(lineReq -> {
            // Sanitize quantities (no negative qty)
            double orderedQty = Math.max(0d, lineReq.orderedQty());
            double receivedQty = Math.max(0d, lineReq.receivedQty());

            // Ignore completely empty lines
            if (orderedQty <= 0d && receivedQty <= 0d) {
                return;
            }

            Material material = requireMaterial(lineReq.materialId());

            // Total BOM allocation for this material in this project
            double allocation = requireBomAllocation(project, material);

            /*
            * 1) Check ORDERED quantity against allocation
            *    totalOrdered = alreadyOrderedInDB + pendingOrderedInThisRequest + newOrderedQty
            *    must be <= allocation
            */
            double alreadyOrdered = safeDouble(
                inwardLineRepository.sumOrderedQtyByProjectAndMaterial(
                    project.getId(),
                    material.getId()
                )
            );
            double pendingOrdered = pendingOrderedByMaterial.getOrDefault(material.getId(), 0d);
            double nextOrderedTotal = alreadyOrdered + pendingOrdered + orderedQty;

            if (nextOrderedTotal > allocation) {
                throw new BadRequestException(
                    "Ordering "
                        + material.getCode()
                        + " exceeds the allocated requirement ("
                        + allocation
                        + "). Please reduce the ordered quantity or update the project allocation."
                );
            }

            /*
            * 2) Check RECEIVED quantity against allocation
            *    totalReceived = alreadyReceivedInDB + pendingReceivedInThisRequest + newReceivedQty
            *    must be <= allocation
            */
            double alreadyReceived = safeDouble(
                inwardLineRepository.sumReceivedQtyByProjectAndMaterial(
                    project.getId(),
                    material.getId()
                )
            );
            double pendingReceived = pendingReceivedByMaterial.getOrDefault(material.getId(), 0d);
            double nextReceivedTotal = alreadyReceived + pendingReceived + receivedQty;

            if (nextReceivedTotal > allocation) {
                throw new BadRequestException(
                    "Receiving "
                        + material.getCode()
                        + " exceeds the allocated requirement. Please submit a procurement request."
                );
            }

            // Create inward line
            InwardLine line = new InwardLine();
            line.setRecord(record);
            line.setMaterial(material);
            line.setOrderedQty(orderedQty);
            line.setReceivedQty(receivedQty);
            lines.add(line);

            // Update material aggregates
            if (orderedQty > 0d) {
                material.setOrderedQty(material.getOrderedQty() + orderedQty);
            }
            if (receivedQty > 0d) {
                material.setReceivedQty(material.getReceivedQty() + receivedQty);
            }
            material.syncBalance();

            // Keep track for this request
            pendingOrderedByMaterial.put(material.getId(), pendingOrdered + orderedQty);
            pendingReceivedByMaterial.put(material.getId(), pendingReceived + receivedQty);
        });

        if (lines.isEmpty()) {
            throw new BadRequestException("At least one inward line with quantity is required");
        }

        record.setLines(lines);
        inwardRecordRepository.save(record);
    }


    @Transactional
    public void registerOutward(OutwardRequest request) {
        if (request.lines() == null || request.lines().isEmpty()) {
            throw new BadRequestException("At least one outward line is required");
        }

        Project project = requireProject(request.projectId());
        LocalDate requestedDate = parseDate(request.date());
        final LocalDate registerDate = requestedDate != null ? requestedDate : LocalDate.now();

        OutwardRegister register = outwardRegisterRepository
            .findByProjectIdAndDate(project.getId(), registerDate)
            .orElseGet(() -> {
                OutwardRegister fresh = new OutwardRegister();
                fresh.setProject(project);
                fresh.setDate(registerDate);
                fresh.setCode(resolveOrGenerateCode(request.code(), () -> generateCodes().outwardCode()));
                fresh.setIssueTo(request.issueTo());

                if (StringUtils.hasText(request.status())) {
                    OutwardStatus status = OutwardStatus.valueOf(request.status());
                    fresh.setStatus(status);
                    if (status == OutwardStatus.CLOSED) {
                        fresh.setCloseDate(LocalDate.now());
                    } else {
                        fresh.setCloseDate(parseDate(request.closeDate()));
                    }
                } else {
                    fresh.setStatus(OutwardStatus.OPEN);
                    fresh.setCloseDate(null);
                }

                return fresh;
            });

        if (register.getStatus() == OutwardStatus.CLOSED) {
            throw new BadRequestException("Outward register already closed for this date");
        }

        // Existing lines for this register, keyed by material
        Map<Long, OutwardLine> existing = register
            .getLines()
            .stream()
            .collect(Collectors.toMap(line -> line.getMaterial().getId(), line -> line));

        // Track issues happening IN THIS REQUEST per material
        Map<Long, Double> pendingIssuesByMaterial = new HashMap<>();
        // Cache DB totals to avoid repeating queries
        Map<Long, Double> issuedCache = new HashMap<>();
        Map<Long, Double> receivedCache = new HashMap<>();
        for (var lineReq : request.lines()) {
            double requestedIssueQty = Math.max(0d, lineReq.issueQty());
            if (requestedIssueQty <= 0d) {
                continue;
            }

            Material material = requireMaterial(lineReq.materialId());
            

            // 1) Compute project-wise received & already issued (from DB)
        double totalReceivedForProject = receivedCache.computeIfAbsent(
            material.getId(),
            id -> safeDouble(
                inwardLineRepository.sumReceivedQtyByProjectAndMaterial(
                    project.getId(),
                    id
                )
            )
        );

        double alreadyIssued = issuedCache.computeIfAbsent(
            material.getId(),
            id -> safeDouble(
                outwardLineRepository.sumIssuedQtyByProjectAndMaterial(
                    project.getId(),
                    id
                )
            )
        );

        // What this request has already decided to issue for this material
        double pending = pendingIssuesByMaterial.getOrDefault(material.getId(), 0d);

        // Project-wise balance BEFORE this line is processed
        double projectBalance = totalReceivedForProject - alreadyIssued - pending;
        if (projectBalance <= 0d) {
            throw new BadRequestException(
                "No balance available for material "
                    + material.getCode()
                    + " in project "
                    + project.getCode()
            );
        }

        // Also ensure we don't exceed global stock
        double globalAvailable = material.getBalanceQty();
        double effectiveAvailable = Math.min(projectBalance, globalAvailable);

        if (requestedIssueQty > effectiveAvailable) {
            throw new BadRequestException(
                "Cannot issue " + requestedIssueQty + " " + material.getUnit()
                    + " of " + material.getCode()
                    + " for project " + project.getCode()
                    + ". Available quantity for this project is "
                    + effectiveAvailable + "."
            );
        }

        // If we reach here, project-wise and global-wise stock is OK
        double issueQty = requestedIssueQty;


                    // 2) BOM allocation check (FINAL issueQty, not requestedIssueQty)
                    // 2) BOM allocation check (using final issueQty)
        double allocation = requireBomAllocation(project, material);
        double nextTotal = alreadyIssued + pending + issueQty;

        if (nextTotal > allocation) {
            throw new BadRequestException(
                "Issuing " + material.getCode()
                    + " exceeds the allocated requirement ("
                    + allocation
                    + "). Please request an increase before issuing more."
            );
        }


            // 3) Create / update outward line
            OutwardLine line = existing.get(material.getId());
            if (line == null) {
                line = new OutwardLine();
                line.setRegister(register);
                line.setMaterial(material);
                line.setIssueQty(0d);
                register.getLines().add(line);
                existing.put(material.getId(), line);
            }

            line.setIssueQty(line.getIssueQty() + issueQty);

            // 4) Update material aggregates
            material.setUtilizedQty(material.getUtilizedQty() + issueQty);
            material.syncBalance();

            pendingIssuesByMaterial.put(material.getId(), pending + issueQty);
        }

        if (StringUtils.hasText(request.issueTo())) {
            register.setIssueTo(request.issueTo());
        }

        if (StringUtils.hasText(request.status())) {
            OutwardStatus newStatus = OutwardStatus.valueOf(request.status());
            register.setStatus(newStatus);
            if (newStatus == OutwardStatus.CLOSED) {
                register.setCloseDate(LocalDate.now());
            } else {
                register.setCloseDate(parseDate(request.closeDate()));
            }
        }

        outwardRegisterRepository.save(register);
    }
    @Transactional
    public void updateOutward(Long registerId, OutwardUpdateRequest request) {
        OutwardRegister register = outwardRegisterRepository
            .findById(registerId)
            .orElseThrow(() -> new NotFoundException("Outward register not found"));

        if (register.getStatus() == OutwardStatus.CLOSED) {
            throw new BadRequestException("Closed registers cannot be edited");
        }

        // 1) Index existing lines and capture current totals PER MATERIAL for this register
        Map<Long, OutwardLine> existingById = register
            .getLines()
            .stream()
            .collect(Collectors.toMap(line -> line.getId(), line -> line));

        Map<Long, Double> currentRegisterTotals = register
            .getLines()
            .stream()
            .filter(line -> line.getMaterial() != null && line.getMaterial().getId() != null)
            .collect(
                Collectors.groupingBy(
                    line -> line.getMaterial().getId(),
                    Collectors.summingDouble(OutwardLine::getIssueQty)
                )
            );

        // 2) Build next lines and aggregate requested totals per material for this register
        List<OutwardLine> nextLines = new ArrayList<>();
        Map<Long, Double> requestedTotals = new HashMap<>();
        Map<Long, Material> requestedMaterials = new HashMap<>();

        if (request.lines() != null) {
            for (var lineReq : request.lines()) {
                if (lineReq.issueQty() <= 0) {
                    // Skip zero / negative quantities
                    continue;
                }

                Material material = requireMaterial(lineReq.materialId());
                requestedTotals.merge(material.getId(), lineReq.issueQty(), Double::sum);
                requestedMaterials.put(material.getId(), material);

                OutwardLine line = null;
                if (lineReq.lineId() != null) {
                    Long id = parseLong(lineReq.lineId());
                    line = existingById.get(id);
                }
                if (line == null) {
                    line = new OutwardLine();
                    line.setRegister(register);
                    line.setMaterial(material);
                }

                // For update we keep the requested quantity as–is.
                // BOM & balance checks are done below at aggregate level.
                line.setIssueQty(lineReq.issueQty());
                nextLines.add(line);
            }
        }

        // 3) BOM VALIDATION: ensure total issued (all registers) <= BOM allocation
        Map<Long, Double> issuedCache = new HashMap<>();
        for (var entry : requestedTotals.entrySet()) {
            Long materialId = entry.getKey();
            Material material = requestedMaterials.get(materialId);
            if (material == null) {
                continue;
            }

            double allocation = requireBomAllocation(register.getProject(), material);

            double totalIssuedFromDb = issuedCache.computeIfAbsent(
                materialId,
                id -> safeDouble(
                    outwardLineRepository.sumIssuedQtyByProjectAndMaterial(
                        register.getProject().getId(),
                        id
                    )
                )
            );

            double currentContribution = currentRegisterTotals.getOrDefault(materialId, 0d);
            double nextTotal = totalIssuedFromDb - currentContribution + entry.getValue();

            double totalReceivedForProject = safeDouble(
                inwardLineRepository.sumReceivedQtyByProjectAndMaterial(
                    register.getProject().getId(),
                    materialId
                )
            );

            // If we apply this update, total issued (all registers) must not exceed what was received
            if (nextTotal > totalReceivedForProject) {
                double currentlyIssuedWithoutThisRegister = totalIssuedFromDb - currentContribution;
                double projectBalance = totalReceivedForProject - currentlyIssuedWithoutThisRegister;
                if (projectBalance < 0d) {
                    projectBalance = 0d;
                }

                throw new BadRequestException(
                    "Cannot set issue quantity for material "
                        + material.getCode()
                        + " to "
                        + entry.getValue()
                        + " in project "
                        + register.getProject().getCode()
                        + " because project balance is only "
                        + projectBalance
                        + "."
                );
            }


            if (nextTotal > allocation) {
                throw new BadRequestException(
                    "Issuing "
                        + material.getCode()
                        + " exceeds the allocated requirement ("
                        + allocation
                        + "). Please request an increase before issuing more."
                );
            }
        }

        

        // 4) Sync Material.utilizedQty and balance based on delta from THIS register
        Set<Long> affectedMaterialIds = new HashSet<>();
        affectedMaterialIds.addAll(currentRegisterTotals.keySet());
        affectedMaterialIds.addAll(requestedTotals.keySet());

        for (Long materialId : affectedMaterialIds) {
            Material material = requestedMaterials.get(materialId);
            if (material == null) {
                material =
                    register
                        .getLines()
                        .stream()
                        .filter(line -> line.getMaterial() != null && materialId.equals(line.getMaterial().getId()))
                        .map(OutwardLine::getMaterial)
                        .findFirst()
                        .orElse(null);
            }

            if (material == null) {
                continue;
            }

            double prevQty = currentRegisterTotals.getOrDefault(materialId, 0d);
            double newQty = requestedTotals.getOrDefault(materialId, 0d);
            double diff = newQty - prevQty;

            if (diff == 0d) {
                continue;
            }

            // Optional extra safety: do not exceed global stock
            if (diff > 0d) {
                double available = material.getBalanceQty();
                if (diff > available) {
                    throw new BadRequestException(
                        "Cannot increase issue quantity for "
                            + material.getCode()
                            + " by "
                            + diff
                            + " because only "
                            + available
                            + " is available in stock."
                    );
                }
            }

            double nextUtilized = material.getUtilizedQty() + diff;
            if (nextUtilized < 0d) {
                nextUtilized = 0d;
            }
            material.setUtilizedQty(nextUtilized);
            material.syncBalance();
        }

        // 5) Replace lines and update register meta-data
        register.getLines().clear();
        register.getLines().addAll(nextLines);

        if (StringUtils.hasText(request.status())) {
            register.setStatus(OutwardStatus.valueOf(request.status()));
            if (register.getStatus() == OutwardStatus.CLOSED) {
                register.setCloseDate(LocalDate.now());
            } else {
                register.setCloseDate(null);
            }
        }

        if (StringUtils.hasText(request.issueTo())) {
            register.setIssueTo(request.issueTo());
        }

        outwardRegisterRepository.save(register);
    }


    @Transactional
    public void registerTransfer(TransferRequest request) {
        if (!StringUtils.hasText(request.toProjectId())) {
            throw new BadRequestException("Destination project is required");
        }
        Project fromProject = requireProject(request.fromProjectId());
        Project toProject = requireProject(request.toProjectId());

        if (request.lines() == null || request.lines().isEmpty()) {
            throw new BadRequestException("At least one transfer line is required");
        }

        String fromSite = StringUtils.hasText(request.fromSite()) ? request.fromSite().trim() : null;
        String toSite = StringUtils.hasText(request.toSite()) ? request.toSite().trim() : null;

        if (fromProject.getId().equals(toProject.getId())) {
            if (!StringUtils.hasText(fromSite) || !StringUtils.hasText(toSite)) {
                throw new BadRequestException("Provide both source and destination sites when transferring within a project");
            }
            if (fromSite.equalsIgnoreCase(toSite)) {
                throw new BadRequestException("Cannot transfer within the same project site");
            }
        }

        TransferRecord record = new TransferRecord();
        record.setCode(resolveOrGenerateCode(request.code(), () -> generateCodes().transferCode()));
        record.setFromProject(fromProject);
        record.setToProject(toProject);
        record.setFromSite(fromSite);
        record.setToSite(toSite);
        record.setRemarks(request.remarks());
        record.setTransferDate(LocalDate.now());

        List<TransferLine> lines = new ArrayList<>();
        List<OutwardLineRequest> outwardLines = new ArrayList<>();
        List<InwardLineRequest> inwardLines = new ArrayList<>();

        request
            .lines()
            .forEach(lineReq -> {
                if (lineReq.transferQty() <= 0) {
                    return;
                }
                Material material = requireMaterial(lineReq.materialId());
                TransferLine line = new TransferLine();
                line.setRecord(record);
                line.setMaterial(material);
                line.setTransferQty(lineReq.transferQty());
                lines.add(line);

                outwardLines.add(new OutwardLineRequest(lineReq.materialId(), lineReq.transferQty()));
                inwardLines.add(new InwardLineRequest(lineReq.materialId(), 0d, lineReq.transferQty()));
            });

        if (lines.isEmpty()) {
            throw new BadRequestException("Transfer quantity must be greater than zero");
        }

        // Persist the transfer record
        record.setLines(lines);
        transferRecordRepository.save(record);

        // Auto-create outward (source) and inward (destination) movements based on the transfer
        registerOutward(
            new OutwardRequest(
                null,
                request.fromProjectId(),
                "Transfer to " + toProject.getCode(),
                null,
                null,
                null,
                outwardLines
            )
        );

        registerInward(
            new InwardRequest(
                null,
                request.toProjectId(),
                InwardType.RETURN.name(),
                null,
                null,
                null,
                null,
                "Transfer from " + fromProject.getCode(),
                fromProject.getName(),
                inwardLines
            )
        );
    }

    private String resolveOrGenerateCode(String requested, Supplier<String> generator) {
        if (StringUtils.hasText(requested)) {
            return requested.trim();
        }
        return generator.get();
    }

    private String buildDailyCode(String prefix, LocalDate date, long sequence) {
        long safeSequence = Math.max(1, sequence);
        return String.format("%s-%s-%03d", prefix, CODE_DATE.format(date), safeSequence);
    }

    private Project requireProject(String id) {
        return projectRepository.findById(parseLong(id)).orElseThrow(() -> new NotFoundException("Project not found"));
    }

    private Material requireMaterial(String id) {
        return materialRepository.findById(parseLong(id)).orElseThrow(() -> new NotFoundException("Material not found"));
    }

    private double requireBomAllocation(Project project, Material material) {
        if (project == null || material == null) {
            throw new BadRequestException("Project and material are required");
        }
        BomLine line = bomLineRepository
            .findByProjectIdAndMaterialId(project.getId(), material.getId())
            .orElseThrow(() -> new BadRequestException("Material " + material.getCode() + " is not allocated to this project"));
        return line.getQuantity();
    }

    private double safeDouble(Double value) {
        return value != null ? value : 0d;
    }

    private LocalDate parseDate(String date) {
        if (!StringUtils.hasText(date)) {
            return null;
        }
        return LocalDate.parse(date);
    }

    private Long parseLong(String value) {
        if (!StringUtils.hasText(value)) {
            throw new BadRequestException("Identifier is required");
        }
        return Long.parseLong(value);
    }
}
