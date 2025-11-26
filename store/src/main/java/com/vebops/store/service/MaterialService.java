package com.vebops.store.service;

import com.vebops.store.dto.MaterialDto;
import com.vebops.store.dto.MaterialRequest;
import com.vebops.store.dto.PaginatedResponse;
import com.vebops.store.exception.BadRequestException;
import com.vebops.store.exception.NotFoundException;
import com.vebops.store.model.Material;
import com.vebops.store.repository.MaterialRepository;
import java.io.IOException;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import jakarta.persistence.criteria.Predicate;
import org.apache.poi.ss.usermodel.DataFormatter;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.ss.usermodel.WorkbookFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;
import java.io.ByteArrayOutputStream;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;


@Service
public class MaterialService {

    private final MaterialRepository materialRepository;

    public MaterialService(MaterialRepository materialRepository) {
        this.materialRepository = materialRepository;
    }

    public List<MaterialDto> list() {
        return materialRepository.findAll().stream().sorted(Comparator.comparing(Material::getCode)).map(this::toDto).toList();
    }

    public PaginatedResponse<MaterialDto> search(
        String search,
        List<String> categories,
        List<String> units,
        List<String> lineTypes,
        int page,
        int size
    ) {
        int safePage = normalizePage(page);
        int safeSize = normalizeSize(size);
        Specification<Material> spec = Specification.where(null);
        if (StringUtils.hasText(search)) {
            String query = "%" + search.trim().toLowerCase() + "%";
            spec = spec.and((root, q, cb) -> {
                Predicate codePredicate = cb.like(cb.lower(root.get("code")), query);
                Predicate namePredicate = cb.like(cb.lower(root.get("name")), query);
                Predicate partPredicate = cb.like(cb.lower(root.get("partNo")), query);
                return cb.or(codePredicate, namePredicate, partPredicate);
            });
        }
        if (categories != null && !categories.isEmpty()) {
            List<String> normalized = categories.stream().filter(StringUtils::hasText).map(String::trim).toList();
            if (!normalized.isEmpty()) {
                spec = spec.and((root, q, cb) -> root.get("category").in(normalized));
            }
        }
        if (units != null && !units.isEmpty()) {
            List<String> normalized = units.stream().filter(StringUtils::hasText).map(String::trim).toList();
            if (!normalized.isEmpty()) {
                spec = spec.and((root, q, cb) -> root.get("unit").in(normalized));
            }
        }
        if (lineTypes != null && !lineTypes.isEmpty()) {
            List<String> normalized = lineTypes.stream().filter(StringUtils::hasText).map(String::trim).toList();
            if (!normalized.isEmpty()) {
                spec = spec.and((root, q, cb) -> root.get("lineType").in(normalized));
            }
        }
        Pageable pageable = PageRequest.of(safePage - 1, safeSize, Sort.by("code").ascending());
        Page<Material> result = materialRepository.findAll(spec, pageable);
        List<MaterialDto> items = result.stream().map(this::toDto).toList();
        Map<String, List<String>> filters = Map.of(
            "categories",
            normalizeFilter(materialRepository.distinctCategories()),
            "units",
            normalizeFilter(materialRepository.distinctUnits()),
            "lineTypes",
            normalizeFilter(materialRepository.distinctLineTypes())
        );
        return new PaginatedResponse<>(
            items,
            result.getTotalElements(),
            safePage,
            safeSize,
            result.getTotalPages(),
            result.hasNext(),
            result.hasPrevious(),
            filters
        );
    }

    public MaterialDto create(MaterialRequest request) {
        validate(request);
        materialRepository
            .findByCodeIgnoreCase(request.code())
            .ifPresent(existing -> {
                throw new BadRequestException("Material code already exists");
            });
        Material material = new Material();
        material.setCode(generateUniqueCode());
        apply(material, request);
        material.syncBalance();
        return toDto(materialRepository.save(material));
    }

    public MaterialDto update(Long id, MaterialRequest request) {
        validate(request);
        Material material = materialRepository.findById(id).orElseThrow(() -> new NotFoundException("Material not found"));
        apply(material, request);
        material.syncBalance();
        return toDto(materialRepository.save(material));
    }

    public void delete(Long id) {
        materialRepository.deleteById(id);
    }

    public List<MaterialDto> importMaterials(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new BadRequestException("An Excel file is required");
        }
        try (InputStream inputStream = file.getInputStream(); Workbook workbook = WorkbookFactory.create(inputStream)) {
            if (workbook.getNumberOfSheets() == 0) {
                throw new BadRequestException("The uploaded file does not contain any sheets");
            }
            Sheet sheet = workbook.getSheetAt(0);
            if (sheet == null) {
                throw new BadRequestException("The uploaded sheet is empty");
            }
            DataFormatter formatter = new DataFormatter();
            List<MaterialDto> imported = new ArrayList<>();
            for (Row row : sheet) {
                if (row == null || row.getRowNum() == 0) {
                    continue; // skip header
                }
                String name = normalize(formatter.formatCellValue(row.getCell(0)));
                if (!StringUtils.hasText(name)) {
                    continue;
                }
                String partNo = normalize(formatter.formatCellValue(row.getCell(1)));
                String lineType = normalize(formatter.formatCellValue(row.getCell(2)));
                String unit = normalize(formatter.formatCellValue(row.getCell(3)));
                String category = normalize(formatter.formatCellValue(row.getCell(4)));
                String code = normalize(formatter.formatCellValue(row.getCell(5)));
                Material material;

                if (StringUtils.hasText(code)) {
                    // Update existing or create new with the given code
                    material = materialRepository.findByCodeIgnoreCase(code).orElseGet(Material::new);
                } else {
                    // Completely new material – generate a code
                    material = new Material();
                    material.setCode(generateUniqueCode());
                }
                material.setName(name);
                material.setPartNo(partNo);
                material.setLineType(lineType);
                material.setUnit(unit);
                material.setCategory(category);
                material.syncBalance();

                Material saved = materialRepository.save(material);
                imported.add(toDto(saved));
            }
            if (imported.isEmpty()) {
                throw new BadRequestException("No valid materials were found in the file");
            }
            return imported;
        } catch (IOException ex) {
            throw new BadRequestException("Unable to read the uploaded file");
        } catch (Exception ex) {
            throw new BadRequestException("Failed to import materials: " + ex.getMessage());
        }
    }

    private void apply(Material material, MaterialRequest request) {
        material.setName(request.name().trim());
        material.setPartNo(request.partNo());
        material.setLineType(request.lineType());
        material.setUnit(request.unit());
        material.setCategory(request.category());
    }

    private void validate(MaterialRequest request) {
        if (request == null || !StringUtils.hasText(request.name())) {
            throw new BadRequestException("Name is required");
        }
    }

    private String normalize(String value) {
        return value == null ? null : value.trim();
    }

    private MaterialDto toDto(Material material) {
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

    private List<String> normalizeFilter(List<String> values) {
        if (values == null) {
            return List.of();
        }
        return values.stream().filter(StringUtils::hasText).map(String::trim).sorted().toList();
    }

    private int normalizePage(int page) {
        return page <= 0 ? 1 : page;
    }

    private int normalizeSize(int size) {
        if (size <= 0) {
            return 10;
        }
        return Math.min(size, 100);
    }

    private String generateUniqueCode() {
        String code;
        do {
            code = "MAT-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        } while (materialRepository.findByCodeIgnoreCase(code).isPresent());
        return code;
    }

        public byte[] exportMaterials() {
        // Reuse existing list method to keep sorting and DTO mapping consistent
        List<MaterialDto> materials = list();

        try (Workbook workbook = new XSSFWorkbook()) {
            Sheet sheet = workbook.createSheet("Materials");

            int rowIndex = 0;

            // Header row – aligned with your import format
            Row header = sheet.createRow(rowIndex++);
            header.createCell(0).setCellValue("Name");
            header.createCell(1).setCellValue("Part No");
            header.createCell(2).setCellValue("Line Type");
            header.createCell(3).setCellValue("Unit");
            header.createCell(4).setCellValue("Category");
            header.createCell(5).setCellValue("Code");

            // Data rows
            for (MaterialDto material : materials) {
                Row row = sheet.createRow(rowIndex++);
                row.createCell(0).setCellValue(material.name() != null ? material.name() : "");
                row.createCell(1).setCellValue(material.partNo() != null ? material.partNo() : "");
                row.createCell(2).setCellValue(material.lineType() != null ? material.lineType() : "");
                row.createCell(3).setCellValue(material.unit() != null ? material.unit() : "");
                row.createCell(4).setCellValue(material.category() != null ? material.category() : "");
                row.createCell(5).setCellValue(material.code() != null ? material.code() : "");
            }

            // Auto-size columns for nicer file
            for (int i = 0; i <= 5; i++) {
                sheet.autoSizeColumn(i);
            }

            ByteArrayOutputStream out = new ByteArrayOutputStream();
            workbook.write(out);
            return out.toByteArray();
        } catch (IOException ex) {
            throw new BadRequestException("Failed to generate materials Excel file");
        }
    }


}
