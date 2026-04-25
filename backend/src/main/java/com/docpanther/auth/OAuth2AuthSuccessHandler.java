package com.docpanther.auth;

import com.docpanther.auth.model.RegistrationMode;
import com.docpanther.auth.model.User;
import com.docpanther.auth.repository.UserRepository;
import com.docpanther.common.config.AppProperties;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.SimpleUrlAuthenticationSuccessHandler;
import org.springframework.stereotype.Component;
import org.springframework.web.util.UriComponentsBuilder;

import java.io.IOException;

@Component
@RequiredArgsConstructor
@Slf4j
public class OAuth2AuthSuccessHandler extends SimpleUrlAuthenticationSuccessHandler {

    private final UserRepository userRepository;
    private final JwtService jwtService;
    private final AppProperties appProperties;

    @Override
    public void onAuthenticationSuccess(HttpServletRequest request,
                                        HttpServletResponse response,
                                        Authentication authentication) throws IOException {
        OAuth2User oauthUser = (OAuth2User) authentication.getPrincipal();

        String googleId  = oauthUser.getAttribute("sub");
        String email     = oauthUser.getAttribute("email");
        String name      = oauthUser.getAttribute("name");
        String avatarUrl = oauthUser.getAttribute("picture");

        User user = userRepository.findByGoogleId(googleId).orElseGet(() -> {
            User newUser = User.builder()
                .googleId(googleId)
                .email(email)
                .name(name)
                .avatarUrl(avatarUrl)
                .emailVerified(true)
                .registrationMode(RegistrationMode.INDIVIDUAL)
                .build();
            return userRepository.save(newUser);
        });

        if (!user.getName().equals(name) || (avatarUrl != null && !avatarUrl.equals(user.getAvatarUrl()))) {
            user.setName(name);
            user.setAvatarUrl(avatarUrl);
            userRepository.save(user);
        }

        String tenantId = user.getTenantId() != null ? user.getTenantId().toString() : null;
        String accessToken  = jwtService.generateAccessToken(user.getId().toString(), user.getEmail(), tenantId);
        String refreshToken = jwtService.generateRefreshToken(user.getId().toString());

        String redirectUrl = UriComponentsBuilder
            .fromUriString(appProperties.getFrontendUrl() + "/auth/callback")
            .queryParam("access_token", accessToken)
            .queryParam("refresh_token", refreshToken)
            .build().toUriString();

        log.info("OAuth2 login successful for user: {}", email);
        getRedirectStrategy().sendRedirect(request, response, redirectUrl);
    }
}
