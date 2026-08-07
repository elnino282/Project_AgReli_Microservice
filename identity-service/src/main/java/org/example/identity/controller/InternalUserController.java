package org.example.identity.controller;

import lombok.Builder;
import java.util.List;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.example.identity.entity.User;
import org.example.identity.enums.UserStatus;
import org.example.identity.repository.UserRepository;
import org.example.identity.dto.common.PageResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/internal")
@RequiredArgsConstructor
public class InternalUserController {

    private final UserRepository userRepository;
    private final org.example.identity.mapper.UserMapper userMapper;

    @GetMapping("/users/{id}")
    public ResponseEntity<UserInternalDto> getUserInternal(@PathVariable Long id) {
        User user = userRepository.findById(id).orElse(null);
        if (user == null) {
            return ResponseEntity.notFound().build();
        }
        UserInternalDto dto = userMapper.toInternalDto(user);
        return ResponseEntity.ok(dto);
    }

    @GetMapping("/users/{userId}/display-name")
    public ResponseEntity<String> getUserDisplayName(@PathVariable Long userId) {
        return userRepository.findById(userId)
                .map(user -> ResponseEntity.ok(user.getFullName() != null ? user.getFullName() : user.getUsername()))
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/users/employees")
    public ResponseEntity<PageResponse<UserInternalDto>> searchEmployees(
            @RequestParam(required = false) String keyword,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        Pageable pageable = PageRequest.of(page, size);
        Page<User> users = userRepository.searchByRoleAndStatusAndKeyword(
                "EMPLOYEE",
                UserStatus.ACTIVE,
                keyword,
                pageable);

        List<UserInternalDto> dtoList = users.stream().map(userMapper::toInternalDto).toList();

        return ResponseEntity.ok(PageResponse.of(users, dtoList));
    }

    @GetMapping("/users/employees/{id}/validate")
    public ResponseEntity<Boolean> validateEmployee(@PathVariable Long id) {
        boolean exists = userRepository.existsByIdAndRoleCode(id, "EMPLOYEE");
        if (!exists) {
            return ResponseEntity.ok(false);
        }
        User user = userRepository.findById(id).orElse(null);
        boolean active = user != null && user.getStatus() == UserStatus.ACTIVE;
        return ResponseEntity.ok(active);
    }

    @PostMapping("/users/employees/validate-batch")
    public ResponseEntity<List<UserInternalDto>> validateEmployeesBatch(@RequestBody List<Long> userIds) {
        if (userIds == null || userIds.isEmpty()) {
            return ResponseEntity.ok(List.of());
        }
        List<User> activeEmployees = userRepository.findActiveEmployeesByIds(userIds);
        List<UserInternalDto> dtoList = activeEmployees.stream().map(userMapper::toInternalDto).toList();
        return ResponseEntity.ok(dtoList);
    }

    @Data
    public static class UserInternalDto {
        private Long id;
        private String username;
        private String email;
        private String fullName;
        private String phone;
    }
}
