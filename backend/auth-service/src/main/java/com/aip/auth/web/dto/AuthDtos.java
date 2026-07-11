package com.aip.auth.web.dto;

import com.aip.auth.user.User;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public final class AuthDtos {

    private AuthDtos() {
    }

    public record RegisterRequest(
            @NotBlank @Size(max = 120) String fullName,
            @NotBlank @Email @Size(max = 200) String email,
            @NotBlank @Pattern(regexp = "\\+?[\\d\\s-]{10,15}", message = "must be a valid mobile number") String mobile,
            @NotBlank @Size(min = 8, max = 100) String password) {
    }

    public record LoginRequest(
            @NotBlank @Email String email,
            @NotBlank String password) {
    }

    public record UpdateProfileRequest(
            @NotBlank @Size(max = 120) String fullName,
            @NotBlank @Pattern(regexp = "\\+?[\\d\\s-]{10,15}", message = "must be a valid mobile number") String mobile) {
    }

    public record ChangePasswordRequest(
            @NotBlank String currentPassword,
            @NotBlank @Size(min = 8, max = 100) String newPassword) {
    }

    public record UserResponse(String id, String email, String name, String mobile, String role) {

        public static UserResponse from(User user) {
            return new UserResponse(
                    user.getId().toString(),
                    user.getEmail(),
                    user.getFullName(),
                    user.getMobile(),
                    user.getRole().name());
        }
    }

    public record LoginResponse(String token, UserResponse user) {
    }
}
