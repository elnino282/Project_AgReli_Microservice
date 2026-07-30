package org.example.identity.service;

import com.nimbusds.jose.*;
import com.nimbusds.jose.crypto.RSASSASigner;
import com.nimbusds.jose.crypto.RSASSAVerifier;
import com.nimbusds.jwt.JWTClaimsSet;
import com.nimbusds.jwt.SignedJWT;
import java.text.ParseException;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Date;
import java.util.StringJoiner;
import java.util.UUID;
import lombok.extern.slf4j.Slf4j;
import org.example.identity.config.RsaKeyProvider;
import org.example.identity.exception.AppException;
import org.example.identity.exception.ErrorCode;
import org.example.identity.entity.User;
import org.example.identity.repository.InvalidatedTokenRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.util.CollectionUtils;

/**
 * Service responsible for JWT token operations.
 * Uses RS256 (RSA PKCS#1 v1.5 with SHA-256) for asymmetric signing.
 *
 * The private key is held exclusively by the identity-service.
 * Other services verify tokens using the public key exposed via the JWKS endpoint.
 */
@Service
@Slf4j
public class JwtTokenService {

    private final InvalidatedTokenRepository invalidatedTokenRepository;
    private final RsaKeyProvider rsaKeyProvider;

    @Value("${jwt.valid-duration:3600}")
    private long validDuration;

    @Value("${jwt.refreshable-duration:36000}")
    private long refreshableDuration;

    public JwtTokenService(InvalidatedTokenRepository invalidatedTokenRepository,
                           RsaKeyProvider rsaKeyProvider) {
        this.invalidatedTokenRepository = invalidatedTokenRepository;
        this.rsaKeyProvider = rsaKeyProvider;
    }

    /**
     * Get the valid duration for tokens.
     */
    public long getValidDuration() {
        return validDuration;
    }

    /**
     * Get the refreshable duration for tokens.
     */
    public long getRefreshableDuration() {
        return refreshableDuration;
    }

    /**
     * Generate JWT token with required claims, signed with RS256.
     * Claims include: sub (userId), role, user_id, email, username, scope, jti, exp
     *
     * @param user        the user to generate token for
     * @param primaryRole the user's primary role
     * @return the generated JWT token string
     */
    public String generateToken(User user, String primaryRole) {
        log.debug("Generating RS256 JWT token for user: {}", user.getEmail());

        JWSHeader header = new JWSHeader.Builder(JWSAlgorithm.RS256)
                .keyID(rsaKeyProvider.getRsaJwk().getKeyID())
                .build();

        JWTClaimsSet jwtClaimsSet = new JWTClaimsSet.Builder()
                .subject(String.valueOf(user.getId()))
                .issuer("QuanLyMuaVu")
                .issueTime(new Date())
                .expirationTime(new Date(
                        Instant.now().plus(validDuration, ChronoUnit.SECONDS).toEpochMilli()))
                .jwtID(UUID.randomUUID().toString())
                .claim("user_id", user.getId())
                .claim("username", user.getUsername())
                .claim("full_name", user.getFullName())
                .claim("email", user.getEmail())
                .claim("role", primaryRole)
                .claim("scope", buildScope(user))
                .build();

        Payload payload = new Payload(jwtClaimsSet.toJSONObject());
        JWSObject jwsObject = new JWSObject(header, payload);

        try {
            jwsObject.sign(new RSASSASigner(rsaKeyProvider.getPrivateKey()));
            String token = jwsObject.serialize();
            log.debug("RS256 JWT token generated successfully for email: {} - expires in {} seconds",
                    user.getEmail(), validDuration);
            return token;
        } catch (JOSEException e) {
            log.error("Cannot create token for user: {}", user.getEmail(), e);
            throw new RuntimeException(e);
        }
    }

    /**
     * Verify a JWT token using the RSA public key.
     *
     * @param token     the token to verify
     * @param isRefresh whether this is a refresh token verification
     * @return the verified SignedJWT
     * @throws JOSEException  if verification fails
     * @throws ParseException if token parsing fails
     */
    public SignedJWT verifyToken(String token, boolean isRefresh) throws JOSEException, ParseException {
        log.debug("Verifying token - isRefresh: {}", isRefresh);

        JWSVerifier verifier = new RSASSAVerifier(rsaKeyProvider.getPublicKey());
        SignedJWT signedJWT = SignedJWT.parse(token);

        Date expiryTime = (isRefresh)
                ? new Date(signedJWT
                        .getJWTClaimsSet()
                        .getIssueTime()
                        .toInstant()
                        .plus(refreshableDuration, ChronoUnit.SECONDS)
                        .toEpochMilli())
                : signedJWT.getJWTClaimsSet().getExpirationTime();

        var verified = signedJWT.verify(verifier);

        if (!(verified && expiryTime.after(new Date()))) {
            log.warn("Token verification failed - verified: {}, expired: {}",
                    verified, expiryTime.before(new Date()));
            throw new AppException(ErrorCode.UNAUTHENTICATED);
        }

        if (invalidatedTokenRepository.existsById(signedJWT.getJWTClaimsSet().getJWTID())) {
            log.warn("Token is invalidated - JIT: {}", signedJWT.getJWTClaimsSet().getJWTID());
            throw new AppException(ErrorCode.UNAUTHENTICATED);
        }

        log.debug("Token verification successful");
        return signedJWT;
    }

    /**
     * Build the scope string from user roles.
     */
    public String buildScope(User user) {
        StringJoiner stringJoiner = new StringJoiner(" ");

        if (!CollectionUtils.isEmpty(user.getRoles())) {
            user.getRoles().forEach(role -> {
                stringJoiner.add("ROLE_" + role.getCode());
            });
        }

        return stringJoiner.toString();
    }
}
