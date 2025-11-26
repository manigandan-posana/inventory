package com.vebops.store.service;

import com.vebops.store.dto.AnalyticsDto;
import com.vebops.store.dto.CreateProjectRequest;
import com.vebops.store.dto.CreateUserRequest;
import com.vebops.store.dto.PaginatedResponse;
import com.vebops.store.dto.ProjectDto;
import com.vebops.store.dto.UpdateProjectRequest;
import com.vebops.store.dto.UpdateUserRequest;
import com.vebops.store.dto.UserDto;
import com.vebops.store.exception.BadRequestException;
import com.vebops.store.exception.NotFoundException;
import com.vebops.store.model.AccessType;
import com.vebops.store.model.Project;
import com.vebops.store.model.Role;
import com.vebops.store.model.UserAccount;
import com.vebops.store.repository.BomLineRepository;
import com.vebops.store.repository.MaterialRepository;
import com.vebops.store.repository.ProjectRepository;
import com.vebops.store.repository.UserRepository;
import jakarta.persistence.criteria.Join;
import jakarta.persistence.criteria.JoinType;
import jakarta.persistence.criteria.Predicate;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import java.util.stream.Stream;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

@Service
public class AdminService {

    private final ProjectRepository projectRepository;
    private final UserRepository userRepository;
    private final MaterialRepository materialRepository;
    private final BomLineRepository bomLineRepository;
    private final PasswordEncoder passwordEncoder;

    public AdminService(
        ProjectRepository projectRepository,
        UserRepository userRepository,
        MaterialRepository materialRepository,
        BomLineRepository bomLineRepository,
        PasswordEncoder passwordEncoder
    ) {
        this.projectRepository = projectRepository;
        this.userRepository = userRepository;
        this.materialRepository = materialRepository;
        this.bomLineRepository = bomLineRepository;
        this.passwordEncoder = passwordEncoder;
    }

    public PaginatedResponse<ProjectDto> searchProjects(
        String search,
        List<String> prefixes,
        String allocationFilter,
        int page,
        int size
    ) {
        int safePage = normalizePage(page);
        int safeSize = normalizeSize(size);
        Specification<Project> spec = Specification.where(null);
        if (StringUtils.hasText(search)) {
            String query = "%" + search.trim().toLowerCase() + "%";
            spec = spec.and((root, q, cb) -> {
                Predicate code = cb.like(cb.lower(root.get("code")), query);
                Predicate name = cb.like(cb.lower(root.get("name")), query);
                return cb.or(code, name);
            });
        }
        if (prefixes != null && !prefixes.isEmpty()) {
            Set<String> normalized = prefixes
                .stream()
                .filter(StringUtils::hasText)
                .map(String::trim)
                .map(prefix -> prefix.substring(0, 1).toUpperCase())
                .collect(Collectors.toSet());
            if (!normalized.isEmpty()) {
                spec = spec.and((root, q, cb) -> cb.upper(cb.substring(root.get("code"), 1, 1)).in(normalized));
            }
        }
        if (StringUtils.hasText(allocationFilter)) {
            Set<Long> allocatedProjects = bomLineRepository.projectIdsWithAllocations();
            if ("WITH_ALLOCATIONS".equalsIgnoreCase(allocationFilter)) {
                if (allocatedProjects.isEmpty()) {
                    spec = spec.and((root, q, cb) -> cb.disjunction());
                } else {
                    spec = spec.and((root, q, cb) -> root.get("id").in(allocatedProjects));
                }
            } else if ("WITHOUT_ALLOCATIONS".equalsIgnoreCase(allocationFilter) && !allocatedProjects.isEmpty()) {
                spec = spec.and((root, q, cb) -> cb.not(root.get("id").in(allocatedProjects)));
            }
        }
        Pageable pageable = PageRequest.of(safePage - 1, safeSize, Sort.by("code").ascending());
        Page<Project> result = projectRepository.findAll(spec, pageable);
        List<ProjectDto> items = result.stream().map(this::toProjectDto).toList();
        List<String> prefixOptions = projectRepository
            .distinctCodePrefixes()
            .stream()
            .filter(StringUtils::hasText)
            .map(String::trim)
            .map(prefix -> prefix.substring(0, 1))
            .sorted()
            .toList();
        Map<String, List<String>> filters = Map.of("prefixes", prefixOptions);
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

    public ProjectDto createProject(CreateProjectRequest request) {
        if (request == null || !StringUtils.hasText(request.code()) || !StringUtils.hasText(request.name())) {
            throw new BadRequestException("Project code and name are required");
        }
        projectRepository
            .findByCodeIgnoreCase(request.code())
            .ifPresent(existing -> {
                throw new BadRequestException("Project code already exists");
            });
        Project project = new Project();
        project.setCode(request.code().trim());
        project.setName(request.name().trim());
        return toProjectDto(projectRepository.save(project));
    }

    public ProjectDto updateProject(Long id, UpdateProjectRequest request) {
        Project project = projectRepository.findById(id).orElseThrow(() -> new NotFoundException("Project not found"));
        if (request == null || (!StringUtils.hasText(request.code()) && !StringUtils.hasText(request.name()))) {
            throw new BadRequestException("Project code or name is required");
        }
        if (StringUtils.hasText(request.code())) {
            String nextCode = request.code().trim();
            projectRepository
                .findByCodeIgnoreCase(nextCode)
                .ifPresent(existing -> {
                    if (!existing.getId().equals(id)) {
                        throw new BadRequestException("Project code already exists");
                    }
                });
            project.setCode(nextCode);
        }
        if (StringUtils.hasText(request.name())) {
            project.setName(request.name().trim());
        }
        return toProjectDto(projectRepository.save(project));
    }

    public void deleteProject(Long id) {
        if (!projectRepository.existsById(id)) {
            throw new NotFoundException("Project not found");
        }
        projectRepository.deleteById(id);
    }

    public PaginatedResponse<UserDto> searchUsers(
        AuthService authService,
        String search,
        List<String> roles,
        List<String> accessTypes,
        List<String> projectIds,
        int page,
        int size
    ) {
        int safePage = normalizePage(page);
        int safeSize = normalizeSize(size);
        Specification<UserAccount> spec = Specification.where(null);
        if (StringUtils.hasText(search)) {
            String query = "%" + search.trim().toLowerCase() + "%";
            spec = spec.and((root, q, cb) -> {
                Predicate name = cb.like(cb.lower(root.get("name")), query);
                Predicate email = cb.like(cb.lower(root.get("email")), query);
                Predicate roleMatch = cb.like(cb.lower(root.get("role")), query);
                return cb.or(name, email, roleMatch);
            });
        }
        if (roles != null && !roles.isEmpty()) {
            Set<Role> resolvedRoles = roles
                .stream()
                .filter(StringUtils::hasText)
                .map(String::trim)
                .map(String::toUpperCase)
                .map(this::parseRoleValue)
                .collect(Collectors.toSet());
            if (!resolvedRoles.isEmpty()) {
                spec = spec.and((root, q, cb) -> root.get("role").in(resolvedRoles));
            }
        }
        if (accessTypes != null && !accessTypes.isEmpty()) {
            Set<AccessType> resolved = accessTypes
                .stream()
                .filter(StringUtils::hasText)
                .map(String::trim)
                .map(String::toUpperCase)
                .map(this::parseAccessValue)
                .collect(Collectors.toSet());
            if (!resolved.isEmpty()) {
                spec = spec.and((root, q, cb) -> root.get("accessType").in(resolved));
            }
        }
        if (projectIds != null && !projectIds.isEmpty()) {
            Set<Long> resolved = projectIds
                .stream()
                .filter(StringUtils::hasText)
                .map(String::trim)
                .map(this::parseProjectId)
                .collect(Collectors.toSet());
            if (!resolved.isEmpty()) {
                spec = spec.and((root, q, cb) -> {
                    q.distinct(true);
                    Join<UserAccount, Project> join = root.join("projects", JoinType.LEFT);
                    return join.get("id").in(resolved);
                });
            }
        }
        Pageable pageable = PageRequest.of(safePage - 1, safeSize, Sort.by("name").ascending().and(Sort.by("email").ascending()));
        Page<UserAccount> result = userRepository.findAll(spec, pageable);
        List<UserDto> items = result.stream().map(authService::toUserDto).toList();
        List<String> projectFilters = projectRepository
            .findAll(Sort.by("code").ascending())
            .stream()
            .map(Project::getId)
            .map(String::valueOf)
            .toList();
        Map<String, List<String>> filters = Map.of(
            "roles",
            Stream.of(Role.values()).map(Role::name).sorted().toList(),
            "accessTypes",
            Stream.of(AccessType.values()).map(AccessType::name).sorted().toList(),
            "projects",
            projectFilters
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

    public UserDto createUser(CreateUserRequest request, AuthService authService) {
        validateUserRequest(request.name(), request.email(), request.password());
        userRepository
            .findByEmailIgnoreCase(request.email())
            .ifPresent(existing -> {
                throw new BadRequestException("Email already in use");
            });
        UserAccount user = new UserAccount();
        applyUserFields(user, request.name(), request.role(), request.accessType());
        user.setEmail(request.email().trim());
        user.setPasswordHash(passwordEncoder.encode(request.password()));
        assignProjects(user, request.projectIds());
        return authService.toUserDto(userRepository.save(user));
    }

    public UserDto updateUser(Long id, UpdateUserRequest request, AuthService authService) {
        UserAccount user = userRepository.findById(id).orElseThrow(() -> new NotFoundException("User not found"));
        if (StringUtils.hasText(request.name())) {
            user.setName(request.name().trim());
        }
        if (StringUtils.hasText(request.password())) {
            user.setPasswordHash(passwordEncoder.encode(request.password()));
        }
        Role nextRole = user.getRole();
        if (StringUtils.hasText(request.role())) {
            nextRole = Role.valueOf(request.role());
            user.setRole(nextRole);
        }
        AccessType nextAccess = resolveAccessType(nextRole, request.accessType());
        user.setAccessType(nextAccess);
        if (request.projectIds() != null) {
            assignProjects(user, request.projectIds());
        }
        return authService.toUserDto(userRepository.save(user));
    }

    public void deleteUser(Long id) {
        userRepository.deleteById(id);
    }

    public AnalyticsDto analytics() {
        long totalProjects = projectRepository.count();
        long totalMaterials = materialRepository.count();
        long totalUsers = userRepository.count();
        double received = materialRepository.findAll().stream().mapToDouble(m -> m.getReceivedQty()).sum();
        double utilized = materialRepository.findAll().stream().mapToDouble(m -> m.getUtilizedQty()).sum();
        return new AnalyticsDto(totalProjects, totalMaterials, totalUsers, received, utilized);
    }

    private void validateUserRequest(String name, String email, String password) {
        if (!StringUtils.hasText(name) || !StringUtils.hasText(email) || !StringUtils.hasText(password)) {
            throw new BadRequestException("Name, email and password are required");
        }
    }

    private void applyUserFields(UserAccount user, String name, String role, String accessType) {
        user.setName(name.trim());
        Role resolvedRole = StringUtils.hasText(role) ? Role.valueOf(role) : Role.USER;
        user.setRole(resolvedRole);
        user.setAccessType(resolveAccessType(resolvedRole, accessType));
    }

    private AccessType resolveAccessType(Role role, String requestedAccessType) {
        return switch (role) {
            case ADMIN, CEO, COO, PROCUREMENT_MANAGER, PROJECT_HEAD -> AccessType.ALL;
            case PROJECT_MANAGER, USER ->
                StringUtils.hasText(requestedAccessType) ? AccessType.valueOf(requestedAccessType) : AccessType.PROJECTS;
        };
    }

    private void assignProjects(UserAccount user, List<String> projectIds) {
        if (projectIds == null) {
            user.getProjects().clear();
            return;
        }
        Set<Project> projects = projectIds
            .stream()
            .filter(StringUtils::hasText)
            .map(Long::valueOf)
            .map(id -> projectRepository.findById(id).orElseThrow(() -> new NotFoundException("Project not found")))
            .collect(Collectors.toSet());
        user.getProjects().clear();
        user.getProjects().addAll(projects);
    }

    private ProjectDto toProjectDto(Project project) {
        return new ProjectDto(String.valueOf(project.getId()), project.getCode(), project.getName());
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

    private Role parseRoleValue(String value) {
        try {
            return Role.valueOf(value);
        } catch (IllegalArgumentException ex) {
            throw new BadRequestException("Unknown role: " + value);
        }
    }

    private AccessType parseAccessValue(String value) {
        try {
            return AccessType.valueOf(value);
        } catch (IllegalArgumentException ex) {
            throw new BadRequestException("Unknown access type: " + value);
        }
    }

    private Long parseProjectId(String value) {
        try {
            return Long.valueOf(value);
        } catch (NumberFormatException ex) {
            throw new BadRequestException("Invalid project id: " + value);
        }
    }
}
