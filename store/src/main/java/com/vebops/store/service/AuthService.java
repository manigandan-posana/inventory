package com.vebops.store.service;

import com.vebops.store.dto.LoginRequest;
import com.vebops.store.dto.LoginResponse;
import com.vebops.store.dto.UserDto;
import com.vebops.store.exception.BadRequestException;
import com.vebops.store.exception.UnauthorizedException;
import com.vebops.store.model.Role;
import com.vebops.store.model.UserAccount;
import com.vebops.store.repository.UserRepository;
import java.util.stream.Collectors;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final TokenService tokenService;

    public AuthService(UserRepository userRepository, PasswordEncoder passwordEncoder, TokenService tokenService) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.tokenService = tokenService;
    }

    public LoginResponse login(LoginRequest request) {
        if (request == null || request.email() == null || request.password() == null) {
            throw new BadRequestException("Email and password are required");
        }
        UserAccount user =
            userRepository.findByEmailIgnoreCase(request.email()).orElseThrow(() -> new UnauthorizedException("Invalid credentials"));
        if (!passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            throw new UnauthorizedException("Invalid credentials");
        }
        String token = tokenService.issueToken(user.getId());
        return new LoginResponse(token, toUserDto(user));
    }

    public void logout(String token) {
        if (token != null) {
            tokenService.revoke(token);
        }
    }

    public UserAccount requireUser(String token) {
        if (token == null || token.isBlank()) {
            throw new UnauthorizedException("Missing authentication token");
        }
        Long userId = tokenService.resolveUserId(token);
        if (userId == null) {
            throw new UnauthorizedException("Invalid token");
        }
        return userRepository
            .findById(userId)
            .orElseThrow(() -> new UnauthorizedException("User not found for token"));
    }

    public UserAccount requireRole(String token, Role... roles) {
        UserAccount user = requireUser(token);
        if (roles == null || roles.length == 0) {
            return user;
        }
        Role userRole = user.getRole();
        for (Role role : roles) {
            if (role == userRole) {
                return user;
            }
        }
        throw new UnauthorizedException("You do not have permission to perform this action");
    }

    public UserDto toUserDto(UserAccount user) {
        return new UserDto(
            String.valueOf(user.getId()),
            user.getName(),
            user.getEmail(),
            user.getRole().name(),
            user.getAccessType().name(),
            user
                .getProjects()
                .stream()
                .map(p -> new com.vebops.store.dto.ProjectDto(String.valueOf(p.getId()), p.getCode(), p.getName()))
                .collect(Collectors.toList())
        );
    }
}
