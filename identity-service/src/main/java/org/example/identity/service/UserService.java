package org.example.identity.service;

import java.time.LocalDateTime;
import java.util.HashSet;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.example.identity.constant.PredefinedRole;
import org.example.identity.enums.UserStatus;
import org.example.identity.exception.AppException;
import org.example.identity.exception.ErrorCode;
import org.example.identity.dto.request.AdminUserCreateRequest;
import org.example.identity.dto.request.AdminUserStatusUpdateRequest;
import org.example.identity.dto.request.AdminUserUpdateRequest;
import org.example.identity.dto.request.ChangePasswordRequest;
import org.example.identity.dto.request.FarmerCreationRequest;
import org.example.identity.dto.request.ResetPasswordRequest;
import org.example.identity.dto.request.SignUpRequest;
import org.example.identity.dto.request.UserProfileUpdateRequest;
import org.example.identity.dto.response.FarmerResponse;
import org.example.identity.entity.Role;
import org.example.identity.entity.User;
import org.example.identity.mapper.FarmerMapper;
import org.example.identity.repository.RoleRepository;
import org.example.identity.repository.UserRepository;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@Slf4j
public class UserService {
    UserRepository userRepository;
    RoleRepository roleRepository;
    FarmerMapper farmerMapper;
    PasswordEncoder passwordEncoder;
    org.example.identity.event.DomainEventPublisher domainEventPublisher;

    public FarmerResponse signUp(SignUpRequest request) {
        String effectiveUsername = request.getEffectiveUsername();
        if (effectiveUsername == null || effectiveUsername.isBlank()) {
            throw new AppException(ErrorCode.USERNAME_BLANK);
        }

        FarmerCreationRequest creationRequest = FarmerCreationRequest.builder()
                .username(effectiveUsername)
                .password(request.getPassword())
                .build();

        User user = farmerMapper.toUser(creationRequest);
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        String email = request.getEmail();
        if (email == null || email.isBlank()) {
            email = effectiveUsername.contains("@") ? effectiveUsername : null;
        }
        if (email != null && !email.isBlank()) {
            user.setEmail(email.trim());
        }

        String fullName = request.getFullName();
        if (fullName != null && !fullName.isBlank()) {
            user.setFullName(fullName.trim());
        }

        String phone = request.getPhone();
        if (phone != null && !phone.isBlank()) {
            user.setPhone(phone.trim());
        }

        HashSet<Role> roles = new HashSet<>();

        String roleCode = request.getRole() != null
                ? request.getRole().trim().toUpperCase()
                : PredefinedRole.BUYER_ROLE;
        if (!PredefinedRole.BUYER_ROLE.equals(roleCode) && !PredefinedRole.FARMER_ROLE.equals(roleCode)) {
            throw new AppException(ErrorCode.BAD_REQUEST);
        }
        roleRepository.findByCode(roleCode).ifPresent(roles::add);

        if (roles.isEmpty()) {
            throw new AppException(ErrorCode.RESOURCE_NOT_FOUND);
        }

        user.setRoles(roles);
        user.setStatus(UserStatus.ACTIVE);
        user.setJoinedDate(LocalDateTime.now());

        try {
            user = userRepository.save(user);
            domainEventPublisher.publish(new org.example.identity.event.UserChangedEvent(user, org.example.identity.event.UserChangedEvent.Action.CREATED));
        } catch (DataIntegrityViolationException exception) {
            throw new AppException(ErrorCode.USER_EXISTED);
        }

        return farmerMapper.toFarmerResponse(user);
    }

    public FarmerResponse getMyInfo() {
        User user = resolveCurrentUser();

        return farmerMapper.toFarmerResponse(user);
    }

    public FarmerResponse updateProfile(UserProfileUpdateRequest request) {
        User user = resolveCurrentUser();

        // Update username if provided and different
        if (request.getUsername() != null && !request.getUsername().isBlank()
                && !request.getUsername().equals(user.getUsername())) {
            if (userRepository.existsByUsername(request.getUsername())) {
                throw new AppException(ErrorCode.USERNAME_ALREADY_EXISTS);
            }
            user.setUsername(request.getUsername());
        }

        // Update email if provided and different
        if (request.getEmail() != null && !request.getEmail().isBlank()
                && !request.getEmail().equalsIgnoreCase(user.getEmail())) {
            if (userRepository.existsByEmailIgnoreCase(request.getEmail())) {
                throw new AppException(ErrorCode.EMAIL_ALREADY_EXISTS);
            }
            user.setEmail(request.getEmail().trim());
        }

        // Update fullName if provided
        if (request.getFullName() != null && !request.getFullName().isBlank()) {
            user.setFullName(request.getFullName().trim());
        }

        // Update phone if provided
        if (request.getPhone() != null && !request.getPhone().isBlank()) {
            user.setPhone(request.getPhone().trim());
        }

        // Update province if provided (store ID directly, no cross-service JPA lookup)
        if (request.getProvinceId() != null) {
            user.setProvinceId(request.getProvinceId());
        }

        // Update ward if provided (store ID directly, no cross-service JPA lookup)
        if (request.getWardId() != null) {
            user.setWardId(request.getWardId());
        }

        User saved = userRepository.save(user);
        domainEventPublisher.publish(new org.example.identity.event.UserChangedEvent(saved, org.example.identity.event.UserChangedEvent.Action.UPDATED));
        return farmerMapper.toFarmerResponse(saved);
    }

    public FarmerResponse changeMyPassword(ChangePasswordRequest request) {
        User user = resolveCurrentUser();

        if (request.getCurrentPassword() == null || request.getCurrentPassword().isBlank()) {
            throw new AppException(ErrorCode.PASSWORD_BLANK);
        }

        if (request.getNewPassword() == null || request.getNewPassword().isBlank()) {
            throw new AppException(ErrorCode.PASSWORD_BLANK);
        }

        if (request.getNewPassword().length() < 8) {
            throw new AppException(ErrorCode.PASSWORD_INVALID);
        }

        if (user.getPassword() == null || user.getPassword().isBlank()) {
            throw new AppException(ErrorCode.PASSWORD_NOT_SET);
        }

        if (!passwordEncoder.matches(request.getCurrentPassword(), user.getPassword())) {
            throw new AppException(ErrorCode.CURRENT_PASSWORD_INCORRECT);
        }

        user.setPassword(passwordEncoder.encode(request.getNewPassword()));
        return farmerMapper.toFarmerResponse(userRepository.save(user));
    }

    public void resetPassword(ResetPasswordRequest request) {
        User user = userRepository.findByUsername(request.getUsername())
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));

        if (request.getNewPassword() == null || request.getNewPassword().length() < 8) {
            throw new AppException(ErrorCode.PASSWORD_INVALID);
        }

        user.setPassword(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(user);
    }

    public FarmerResponse adminCreateUser(AdminUserCreateRequest request) {
        if (request.getUsername() == null || request.getUsername().isBlank()) {
            throw new AppException(ErrorCode.USERNAME_BLANK);
        }
        if (userRepository.existsByUsername(request.getUsername())) {
            throw new AppException(ErrorCode.USER_EXISTED);
        }

        User user = new User();
        user.setUsername(request.getUsername().trim());
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        
        if (request.getEmail() != null && !request.getEmail().isBlank()) {
            if (userRepository.existsByEmailIgnoreCase(request.getEmail())) {
                throw new AppException(ErrorCode.EMAIL_ALREADY_EXISTS);
            }
            user.setEmail(request.getEmail().trim());
        }
        
        if (request.getFullName() != null && !request.getFullName().isBlank()) {
            user.setFullName(request.getFullName().trim());
        }
        
        if (request.getPhone() != null && !request.getPhone().isBlank()) {
            user.setPhone(request.getPhone().trim());
        }

        HashSet<Role> roles = new HashSet<>();
        if (request.getRoles() != null && !request.getRoles().isEmpty()) {
            for (String roleCode : request.getRoles()) {
                roleRepository.findByCode(roleCode.toUpperCase()).ifPresent(roles::add);
            }
        }
        if (roles.isEmpty()) {
            roleRepository.findByCode(PredefinedRole.EMPLOYEE_ROLE).ifPresent(roles::add);
        }
        
        user.setRoles(roles);
        user.setStatus(UserStatus.ACTIVE);
        user.setJoinedDate(LocalDateTime.now());
        
        try {
            user = userRepository.save(user);
            domainEventPublisher.publish(new org.example.identity.event.UserChangedEvent(user, org.example.identity.event.UserChangedEvent.Action.CREATED));
        } catch (DataIntegrityViolationException exception) {
            throw new AppException(ErrorCode.USER_EXISTED);
        }
        
        return farmerMapper.toFarmerResponse(user);
    }

    public FarmerResponse adminUpdateUser(Long id, AdminUserUpdateRequest request) {
        User user = userRepository.findByIdWithRoles(id)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));
                
        if (request.getEmail() != null && !request.getEmail().isBlank() 
                && !request.getEmail().equalsIgnoreCase(user.getEmail())) {
            if (userRepository.existsByEmailIgnoreCase(request.getEmail())) {
                throw new AppException(ErrorCode.EMAIL_ALREADY_EXISTS);
            }
            user.setEmail(request.getEmail().trim());
        }
        
        if (request.getFullName() != null && !request.getFullName().isBlank()) {
            user.setFullName(request.getFullName().trim());
        }
        
        if (request.getPhone() != null && !request.getPhone().isBlank()) {
            user.setPhone(request.getPhone().trim());
        }

        if (request.getRoles() != null) {
            HashSet<Role> newRoles = new HashSet<>();
            for (String roleCode : request.getRoles()) {
                roleRepository.findByCode(roleCode.toUpperCase()).ifPresent(newRoles::add);
            }
            if (!newRoles.isEmpty()) {
                user.setRoles(newRoles);
            }
        }
        
        user = userRepository.save(user);
        domainEventPublisher.publish(new org.example.identity.event.UserChangedEvent(user, org.example.identity.event.UserChangedEvent.Action.UPDATED));
        return farmerMapper.toFarmerResponse(user);
    }

    public void adminUpdateStatus(Long id, AdminUserStatusUpdateRequest request) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));
        user.setStatus(request.getStatus());
        user = userRepository.save(user);
        domainEventPublisher.publish(new org.example.identity.event.UserChangedEvent(user, org.example.identity.event.UserChangedEvent.Action.UPDATED));
    }

    public void adminDeleteUser(Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));
        try {
            userRepository.delete(user);
            domainEventPublisher.publish(new org.example.identity.event.UserChangedEvent(user, org.example.identity.event.UserChangedEvent.Action.DELETED));
        } catch (DataIntegrityViolationException e) {
            throw new AppException(ErrorCode.BAD_REQUEST);
        }
    }

    private User resolveCurrentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new AppException(ErrorCode.UNAUTHENTICATED);
        }

        String identifier = authentication.getName();
        if (identifier == null || identifier.isBlank()) {
            throw new AppException(ErrorCode.UNAUTHENTICATED);
        }

        try {
            Long userId = Long.parseLong(identifier);
            return userRepository.findByIdWithRoles(userId)
                    .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));
        } catch (NumberFormatException ex) {
            return userRepository.findByIdentifierWithRoles(identifier)
                    .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));
        }
    }
}
