package com.vebops.store.controller;

import com.vebops.store.dto.AnalyticsDto;
import com.vebops.store.dto.CreateProjectRequest;
import com.vebops.store.dto.CreateUserRequest;
import com.vebops.store.dto.PaginatedResponse;
import com.vebops.store.dto.ProjectDto;
import com.vebops.store.dto.UpdateProjectRequest;
import com.vebops.store.dto.UpdateUserRequest;
import com.vebops.store.dto.UserDto;
import com.vebops.store.exception.UnauthorizedException;
import com.vebops.store.model.Role;
import com.vebops.store.model.UserAccount;
import com.vebops.store.service.AdminService;
import com.vebops.store.service.AuthService;
import java.util.List;
import jakarta.validation.Valid;
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
@RequestMapping("/api/admin")
public class AdminController {

    private final AuthService authService;
    private final AdminService adminService;

    public AdminController(AuthService authService, AdminService adminService) {
        this.authService = authService;
        this.adminService = adminService;
    }

    @GetMapping("/projects")
    public PaginatedResponse<ProjectDto> projects(
        @RequestHeader("X-Auth-Token") String token,
        @RequestParam(name = "page", defaultValue = "1") int page,
        @RequestParam(name = "size", defaultValue = "10") int size,
        @RequestParam(name = "search", required = false) String search,
        @RequestParam(name = "startsWith", required = false) List<String> prefixes,
        @RequestParam(name = "allocation", required = false) String allocation
    ) {
        ensureAdmin(token);
        return adminService.searchProjects(search, prefixes, allocation, page, size);
    }

    @GetMapping("/projects/search")
    public PaginatedResponse<ProjectDto> searchProjects(
        @RequestHeader("X-Auth-Token") String token,
        @RequestParam(name = "page", defaultValue = "1") int page,
        @RequestParam(name = "size", defaultValue = "10") int size,
        @RequestParam(name = "search", required = false) String search,
        @RequestParam(name = "startsWith", required = false) List<String> prefixes,
        @RequestParam(name = "allocation", required = false) String allocation
    ) {
        return projects(token, page, size, search, prefixes, allocation);
    }

    @PostMapping("/projects")
    public ProjectDto createProject(
        @RequestHeader("X-Auth-Token") String token,
        @Valid @RequestBody CreateProjectRequest request
    ) {
        ensureAdmin(token);
        return adminService.createProject(request);
    }

    @PutMapping("/projects/{id}")
    public ProjectDto updateProject(
        @RequestHeader("X-Auth-Token") String token,
        @PathVariable Long id,
        @Valid @RequestBody UpdateProjectRequest request
    ) {
        ensureAdmin(token);
        return adminService.updateProject(id, request);
    }

    @DeleteMapping("/projects/{id}")
    public void deleteProject(@RequestHeader("X-Auth-Token") String token, @PathVariable Long id) {
        ensureAdmin(token);
        adminService.deleteProject(id);
    }

    @GetMapping("/users")
    public PaginatedResponse<UserDto> listUsers(
        @RequestHeader("X-Auth-Token") String token,
        @RequestParam(name = "page", defaultValue = "1") int page,
        @RequestParam(name = "size", defaultValue = "10") int size,
        @RequestParam(name = "search", required = false) String search,
        @RequestParam(name = "role", required = false) List<String> roles,
        @RequestParam(name = "accessType", required = false) List<String> accessTypes,
        @RequestParam(name = "projectId", required = false) List<String> projectIds
    ) {
        ensureAdmin(token);
        return adminService.searchUsers(authService, search, roles, accessTypes, projectIds, page, size);
    }

    @GetMapping("/users/search")
    public PaginatedResponse<UserDto> searchUsers(
        @RequestHeader("X-Auth-Token") String token,
        @RequestParam(name = "page", defaultValue = "1") int page,
        @RequestParam(name = "size", defaultValue = "10") int size,
        @RequestParam(name = "search", required = false) String search,
        @RequestParam(name = "role", required = false) List<String> roles,
        @RequestParam(name = "accessType", required = false) List<String> accessTypes,
        @RequestParam(name = "projectId", required = false) List<String> projectIds
    ) {
        return listUsers(token, page, size, search, roles, accessTypes, projectIds);
    }

    @PostMapping("/users")
    public UserDto createUser(@RequestHeader("X-Auth-Token") String token, @Valid @RequestBody CreateUserRequest request) {
        ensureAdmin(token);
        return adminService.createUser(request, authService);
    }

    @PutMapping("/users/{id}")
    public UserDto updateUser(
        @RequestHeader("X-Auth-Token") String token,
        @PathVariable Long id,
        @Valid @RequestBody UpdateUserRequest request
    ) {
        ensureAdmin(token);
        return adminService.updateUser(id, request, authService);
    }

    @DeleteMapping("/users/{id}")
    public void deleteUser(@RequestHeader("X-Auth-Token") String token, @PathVariable Long id) {
        ensureAdmin(token);
        adminService.deleteUser(id);
    }

    @GetMapping("/analytics")
    public AnalyticsDto analytics(@RequestHeader("X-Auth-Token") String token) {
        ensureAdmin(token);
        return adminService.analytics();
    }

    private void ensureAdmin(String token) {
        UserAccount user = authService.requireUser(token);
        if (user.getRole() != Role.ADMIN && user.getRole() != Role.CEO && user.getRole() != Role.COO) {
            throw new UnauthorizedException("Admin, CEO or COO role required");
        }
    }
}
