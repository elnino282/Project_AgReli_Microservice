package org.example.identity.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.FieldDefaults;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class AdminUserCreateRequest {

    @NotBlank(message = "USERNAME_BLANK")
    @Size(min = 3, message = "Username must be at least 3 characters")
    String username;

    @NotBlank(message = "PASSWORD_BLANK")
    @Size(min = 8, message = "PASSWORD_INVALID")
    String password;

    String email;
    String fullName;
    String phone;
    
    List<String> roles;
}
