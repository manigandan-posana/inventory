package com.vebops.store.controller;

import com.vebops.store.dto.MaterialDto;
import com.vebops.store.dto.MaterialRequest;
import com.vebops.store.dto.PaginatedResponse;
import com.vebops.store.model.Role;
import com.vebops.store.service.AuthService;
import com.vebops.store.service.MaterialService;
import jakarta.validation.Valid;
import org.springframework.http.MediaType;
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
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;


@RestController
@RequestMapping("/api/materials")
public class MaterialController {

    private final MaterialService materialService;
    private final AuthService authService;

    public MaterialController(MaterialService materialService, AuthService authService) {
        this.materialService = materialService;
        this.authService = authService;
    }

    @GetMapping
    public PaginatedResponse<MaterialDto> list(
        @RequestHeader("X-Auth-Token") String token,
        @RequestParam(name = "page", defaultValue = "1") int page,
        @RequestParam(name = "size", defaultValue = "10") int size,
        @RequestParam(name = "search", required = false) String search,
        @RequestParam(name = "category", required = false) List<String> categories,
        @RequestParam(name = "unit", required = false) List<String> units,
        @RequestParam(name = "lineType", required = false) List<String> lineTypes
    ) {
        authService.requireUser(token);
        return materialService.search(search, categories, units, lineTypes, page, size);
    }

    @GetMapping("/search")
    public PaginatedResponse<MaterialDto> search(
        @RequestHeader("X-Auth-Token") String token,
        @RequestParam(name = "page", defaultValue = "1") int page,
        @RequestParam(name = "size", defaultValue = "10") int size,
        @RequestParam(name = "search", required = false) String search,
        @RequestParam(name = "category", required = false) List<String> categories,
        @RequestParam(name = "unit", required = false) List<String> units,
        @RequestParam(name = "lineType", required = false) List<String> lineTypes
    ) {
        return list(token, page, size, search, categories, units, lineTypes);
    }

    @PostMapping
    public MaterialDto create(
        @RequestHeader("X-Auth-Token") String token,
        @Valid @RequestBody MaterialRequest request
    ) {
        authService.requireRole(token, Role.ADMIN, Role.CEO, Role.COO, Role.PROJECT_HEAD);
        return materialService.create(request);
    }

    @PutMapping("/{id}")
    public MaterialDto update(
        @RequestHeader("X-Auth-Token") String token,
        @PathVariable Long id,
        @Valid @RequestBody MaterialRequest request
    ) {
        authService.requireRole(token, Role.ADMIN, Role.CEO, Role.COO, Role.PROJECT_HEAD);
        return materialService.update(id, request);
    }

    @DeleteMapping("/{id}")
    public void delete(@RequestHeader("X-Auth-Token") String token, @PathVariable Long id) {
        authService.requireRole(token, Role.ADMIN, Role.CEO, Role.COO, Role.PROJECT_HEAD);
        materialService.delete(id);
    }

    @PostMapping(value = "/import", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public List<MaterialDto> importMaterials(
        @RequestHeader("X-Auth-Token") String token,
        @RequestParam("file") MultipartFile file
    ) {
        authService.requireRole(token, Role.ADMIN, Role.CEO, Role.COO, Role.PROJECT_HEAD);
        return materialService.importMaterials(file);
    }

    @GetMapping(value = "/export", produces = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
    public ResponseEntity<byte[]> exportMaterials(@RequestHeader("X-Auth-Token") String token) {
        authService.requireUser(token);

        byte[] bytes = materialService.exportMaterials();

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(
            MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
        );
        headers.setContentDispositionFormData("attachment", "materials.xlsx");
        headers.setContentLength(bytes.length);

        return new ResponseEntity<>(bytes, headers, HttpStatus.OK);
    }

}
