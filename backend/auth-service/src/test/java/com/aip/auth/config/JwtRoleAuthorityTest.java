package com.aip.auth.config;

import com.aip.auth.user.Role;
import org.junit.jupiter.api.Test;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.oauth2.jwt.Jwt;

import java.time.Instant;
import java.util.Collection;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * The tokens carry the role in a "role" claim, which Spring's default converter
 * ignores (it only reads "scope"/"scp"). If this mapping breaks, hasRole("ADMIN")
 * silently never matches and /api/v1/admin/** would reject every admin — so it is
 * worth pinning down.
 */
class JwtRoleAuthorityTest {

    private final SecurityConfig config = new SecurityConfig();

    private static Jwt jwtWithRole(String role) {
        Jwt.Builder builder = Jwt.withTokenValue("token")
                .header("alg", "HS256")
                .subject("11111111-1111-1111-1111-111111111111")
                .issuedAt(Instant.now())
                .expiresAt(Instant.now().plusSeconds(3600));
        if (role != null) {
            builder.claim("role", role);
        } else {
            builder.claim("email", "nobody@demo.com");
        }
        return builder.build();
    }

    private Collection<String> authoritiesFor(String role) {
        var converter = config.jwtAuthenticationConverter();
        var auth = converter.convert(jwtWithRole(role));
        assertThat(auth).isNotNull();
        return auth.getAuthorities().stream().map(GrantedAuthority::getAuthority).toList();
    }

    @Test
    void adminRoleBecomesRoleAdminAuthority() {
        // hasRole("ADMIN") checks for the ROLE_ADMIN authority specifically.
        assertThat(authoritiesFor(Role.ADMIN.name())).containsExactly("ROLE_ADMIN");
    }

    @Test
    void interviewerAndCandidateRolesAreMappedToo() {
        assertThat(authoritiesFor(Role.INTERVIEWER.name())).containsExactly("ROLE_INTERVIEWER");
        assertThat(authoritiesFor(Role.CANDIDATE.name())).containsExactly("ROLE_CANDIDATE");
    }

    @Test
    void tokenWithoutRoleClaimGetsNoAuthorities() {
        // A role-less token must not accidentally inherit admin access.
        assertThat(authoritiesFor(null)).isEmpty();
    }
}
