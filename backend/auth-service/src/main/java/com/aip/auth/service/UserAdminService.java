package com.aip.auth.service;

import com.aip.auth.user.User;
import com.aip.auth.user.UserRepository;
import com.aip.auth.web.dto.AuthDtos.AdminCreateUserRequest;
import com.aip.auth.web.dto.AuthDtos.AdminUpdateUserRequest;
import com.aip.auth.web.dto.AuthDtos.UserResponse;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.UUID;

/**
 * Admin-only user administration. Users reach the system either by registering
 * themselves (always CANDIDATE) or by being created here; both land in the same
 * table, so admins see and manage one list.
 *
 * A role change takes effect at the user's next sign-in, because the role is
 * stamped into the JWT when the token is issued.
 */
@Service
public class UserAdminService {

    private final UserRepository users;
    private final PasswordEncoder passwordEncoder;

    public UserAdminService(UserRepository users, PasswordEncoder passwordEncoder) {
        this.users = users;
        this.passwordEncoder = passwordEncoder;
    }

    @Transactional(readOnly = true)
    public List<UserResponse> list() {
        return users.findAll(Sort.by(Sort.Direction.ASC, "fullName")).stream()
                .map(UserResponse::from)
                .toList();
    }

    @Transactional
    public UserResponse create(AdminCreateUserRequest request) {
        String email = request.email().trim().toLowerCase();
        if (users.existsByEmailIgnoreCase(email)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "An account with this email already exists.");
        }
        User user = new User(
                UUID.randomUUID(),
                email,
                request.fullName().trim(),
                request.mobile().trim(),
                passwordEncoder.encode(request.password()),
                request.role());
        return UserResponse.from(users.save(user));
    }

    @Transactional
    public UserResponse update(UUID id, AdminUpdateUserRequest request) {
        User user = users.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found."));
        String email = request.email().trim().toLowerCase();
        users.findByEmailIgnoreCase(email)
                .filter(other -> !other.getId().equals(id))
                .ifPresent(other -> {
                    throw new ResponseStatusException(HttpStatus.CONFLICT, "Another account already uses this email.");
                });
        user.updateProfile(request.fullName().trim(), request.mobile().trim());
        user.changeEmail(email);
        user.changeRole(request.role());
        return UserResponse.from(users.save(user));
    }

    /**
     * @param actingUserId the signed-in admin — an admin cannot delete their own
     *                     account, which would lock them out mid-session.
     */
    @Transactional
    public void delete(UUID id, UUID actingUserId) {
        if (id.equals(actingUserId)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "You cannot delete your own account.");
        }
        if (!users.existsById(id)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found.");
        }
        users.deleteById(id);
    }
}
