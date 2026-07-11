package com.aip.auth.token;

import com.aip.auth.user.User;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.Date;

@Service
public class JwtService {

    private final SecretKey key;
    private final Duration ttl;
    private final String issuer;

    public JwtService(
            @Value("${aip.jwt.secret}") String secret,
            @Value("${aip.jwt.ttl:PT8H}") Duration ttl,
            @Value("${aip.jwt.issuer:aip-auth}") String issuer) {
        this.key = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        this.ttl = ttl;
        this.issuer = issuer;
    }

    public String issue(User user) {
        Instant now = Instant.now();
        return Jwts.builder()
                .issuer(issuer)
                .subject(user.getId().toString())
                .claim("email", user.getEmail())
                .claim("name", user.getFullName())
                .claim("role", user.getRole().name())
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plus(ttl)))
                // Pin HS256: jjwt otherwise infers the strongest algorithm the
                // key length allows, which must match the resource servers.
                .signWith(key, Jwts.SIG.HS256)
                .compact();
    }
}
