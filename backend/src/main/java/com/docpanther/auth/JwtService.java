package com.docpanther.auth;

import com.docpanther.common.config.AppProperties;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Date;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class JwtService {

    private final AppProperties appProperties;
    private final StringRedisTemplate redis;

    private static final String REFRESH_TOKEN_PREFIX = "rt:";

    private SecretKey signingKey() {
        return Keys.hmacShaKeyFor(appProperties.getJwt().getSecret().getBytes(StandardCharsets.UTF_8));
    }

    public String generateAccessToken(String userId, String email) {
        long now = System.currentTimeMillis();
        return Jwts.builder()
            .subject(userId)
            .claim("email", email)
            .claim("type", "access")
            .issuedAt(new Date(now))
            .expiration(new Date(now + appProperties.getJwt().getAccessTokenExpiryMs()))
            .signWith(signingKey())
            .compact();
    }

    public String generateRefreshToken(String userId) {
        String token = UUID.randomUUID().toString();
        long ttlMs = appProperties.getJwt().getRefreshTokenExpiryMs();
        redis.opsForValue().set(
            REFRESH_TOKEN_PREFIX + token,
            userId,
            Duration.ofMillis(ttlMs)
        );
        return token;
    }

    public Claims parseAccessToken(String token) {
        return Jwts.parser()
            .verifyWith(signingKey())
            .build()
            .parseSignedClaims(token)
            .getPayload();
    }

    public boolean isAccessTokenValid(String token) {
        try {
            Claims claims = parseAccessToken(token);
            return "access".equals(claims.get("type", String.class));
        } catch (JwtException | IllegalArgumentException e) {
            return false;
        }
    }

    /** Returns userId if valid, null otherwise */
    public String validateRefreshToken(String token) {
        return redis.opsForValue().get(REFRESH_TOKEN_PREFIX + token);
    }

    public void revokeRefreshToken(String token) {
        redis.delete(REFRESH_TOKEN_PREFIX + token);
    }
}
