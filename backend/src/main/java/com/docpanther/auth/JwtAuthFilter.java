package com.docpanther.auth;

import com.docpanther.auth.model.User;
import com.docpanther.auth.repository.UserRepository;
import com.docpanther.tenant.PodRoutingService;
import com.docpanther.tenant.TenantContextHolder;
import io.jsonwebtoken.Claims;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Component
@RequiredArgsConstructor
@Slf4j
public class JwtAuthFilter extends OncePerRequestFilter {

    private final JwtService jwtService;
    private final UserRepository userRepository;
    private final PodRoutingService podRoutingService;

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain chain) throws ServletException, IOException {
        try {
            String token = extractToken(request);
            if (token != null && jwtService.isAccessTokenValid(token)) {
                authenticateFromToken(token);
            }
            chain.doFilter(request, response);
        } finally {
            // Always clear per-request tenant context to prevent thread-pool leakage.
            TenantContextHolder.clear();
        }
    }

    private void authenticateFromToken(String token) {
        try {
            Claims claims = jwtService.parseAccessToken(token);
            String userId   = claims.getSubject();
            String tenantId = claims.get("tenantId", String.class);
            String role     = claims.get("role",     String.class);

            userRepository.findById(UUID.fromString(userId)).ifPresent(user -> {
                setSecurityContext(user, role);
                setPodContext(tenantId);
            });
        } catch (Exception e) {
            log.debug("JWT auth failed: {}", e.getMessage());
        }
    }

    private void setSecurityContext(User user, String role) {
        List<SimpleGrantedAuthority> authorities = new ArrayList<>();
        authorities.add(new SimpleGrantedAuthority("ROLE_USER"));
        if (role != null && !role.isBlank()) {
            authorities.add(new SimpleGrantedAuthority("ROLE_" + role));
        }
        var auth = new UsernamePasswordAuthenticationToken(user, null, authorities);
        SecurityContextHolder.getContext().setAuthentication(auth);
    }

    private void setPodContext(String tenantId) {
        if (tenantId == null || tenantId.isBlank()) return;
        try {
            UUID tid   = UUID.fromString(tenantId);
            String podId = podRoutingService.resolvePodId(tid);
            TenantContextHolder.setTenantId(tid);
            if (podId != null) {
                TenantContextHolder.setPodId(podId);
            }
        } catch (Exception e) {
            log.debug("Pod context resolution failed for tenant {}: {}", tenantId, e.getMessage());
        }
    }

    private String extractToken(HttpServletRequest request) {
        String header = request.getHeader("Authorization");
        if (StringUtils.hasText(header) && header.startsWith("Bearer ")) {
            return header.substring(7);
        }
        return null;
    }
}
