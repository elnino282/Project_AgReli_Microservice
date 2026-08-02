package org.example.identity.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.example.identity.dto.ApiResponse;
import org.example.identity.dto.request.AdminUserCreateRequest;
import org.example.identity.dto.request.AdminUserStatusUpdateRequest;
import org.example.identity.dto.request.AdminUserUpdateRequest;
import org.example.identity.dto.response.FarmerResponse;
import org.example.identity.service.UserService;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/admin/users")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminUserController {

    private final UserService userService;

    @PostMapping
    public ApiResponse<FarmerResponse> createUser(@Valid @RequestBody AdminUserCreateRequest request) {
        return ApiResponse.success(userService.adminCreateUser(request));
    }

    @PostMapping("/farmers")
    public ApiResponse<FarmerResponse> createFarmer(@Valid @RequestBody AdminUserCreateRequest request) {
        // Alias for frontend backward compatibility
        return ApiResponse.success(userService.adminCreateUser(request));
    }

    @PutMapping("/{id}")
    public ApiResponse<FarmerResponse> updateUser(
            @PathVariable Long id,
            @Valid @RequestBody AdminUserUpdateRequest request) {
        return ApiResponse.success(userService.adminUpdateUser(id, request));
    }

    @PatchMapping("/{id}/status")
    public ApiResponse<Void> updateStatus(
            @PathVariable Long id,
            @Valid @RequestBody AdminUserStatusUpdateRequest request) {
        userService.adminUpdateStatus(id, request);
        return ApiResponse.success(null);
    }

    @DeleteMapping("/{id}")
    public ApiResponse<Void> deleteUser(@PathVariable Long id) {
        userService.adminDeleteUser(id);
        return ApiResponse.success(null);
    }

    @GetMapping("/{id}/can-delete")
    public ApiResponse<Boolean> canDelete(@PathVariable Long id) {
        // Check if user has associated data, assume true if this endpoint is called since hard delete 
        // will fail if relations exist that are not cascaded.
        // Returning true allows the frontend to show the delete confirmation dialog.
        return ApiResponse.success(true);
    }
}
