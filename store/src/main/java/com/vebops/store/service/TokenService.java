package com.vebops.store.service;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.security.Keys;
import java.nio.charset.StandardCharsets;
import java.security.Key;
import java.time.Instant;
import java.util.Date;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class TokenService {

    private final Key signingKey;
    private final long ttlSeconds;

    public TokenService(
        @Value("${app.jwt.secret:inventory-secret-key}") String secret,
        @Value("${app.jwt.ttl-seconds:86400}") long ttlSeconds
    ) {
        byte[] keyBytes = secret.getBytes(StandardCharsets.UTF_8);
        if (keyBytes.length < 32) {
            byte[] padded = new byte[32];
            System.arraycopy(keyBytes, 0, padded, 0, Math.min(keyBytes.length, padded.length));
            this.signingKey = Keys.hmacShaKeyFor(padded);
        } else {
            this.signingKey = Keys.hmacShaKeyFor(keyBytes);
        }
        this.ttlSeconds = ttlSeconds > 0 ? ttlSeconds : 86400;
    }

    public String issueToken(Long userId) {
        Instant now = Instant.now();
        return Jwts
            .builder()
            .setSubject(String.valueOf(userId))
            .setIssuedAt(Date.from(now))
            .setExpiration(Date.from(now.plusSeconds(ttlSeconds)))
            .signWith(signingKey, SignatureAlgorithm.HS256)
            .compact();
    }

    public Long resolveUserId(String token) {
        try {
            Claims claims = Jwts.parserBuilder().setSigningKey(signingKey).build().parseClaimsJws(token).getBody();
            return Long.valueOf(claims.getSubject());
        } catch (JwtException | IllegalArgumentException ex) {
            return null;
        }
    }

    public void revoke(String token) {
        // JWTs are stateless; nothing to do for logout hooks.
    }
}
