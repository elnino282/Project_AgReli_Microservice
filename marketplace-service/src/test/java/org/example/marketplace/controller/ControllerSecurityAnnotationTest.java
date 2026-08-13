package org.example.marketplace.controller;

import org.junit.jupiter.api.Test;
import org.springframework.context.annotation.ClassPathScanningCandidateComponentProvider;
import org.springframework.core.type.filter.AnnotationTypeFilter;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.lang.reflect.Method;
import java.util.Arrays;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

import static org.junit.jupiter.api.Assertions.fail;

public class ControllerSecurityAnnotationTest {

    private static final List<String> WHITELISTED_METHODS = Arrays.asList(
            "listProducts",
            "getProductBySlug",
            "getProductImage",
            "listProductReviews",
            "listFarms",
            "getFarmDetail",
            "listFarmReviews",
            "getProductTraceability",
            "getPublicTrace",
            "getProductQRCode"
    );

    @Test
    public void testAllEndpointsHaveSecurityOrAreWhitelisted() throws Exception {
        ClassPathScanningCandidateComponentProvider provider = new ClassPathScanningCandidateComponentProvider(false);
        provider.addIncludeFilter(new AnnotationTypeFilter(RestController.class));

        Set<String> classNames = provider.findCandidateComponents("org.example.marketplace.controller").stream()
                .map(beanDefinition -> beanDefinition.getBeanClassName())
                .collect(Collectors.toSet());

        StringBuilder errors = new StringBuilder();

        for (String className : classNames) {
            Class<?> clazz = Class.forName(className);
            boolean hasClassLevelPreAuthorize = clazz.isAnnotationPresent(PreAuthorize.class);

            for (Method method : clazz.getDeclaredMethods()) {
                if (isMappingMethod(method)) {
                    boolean hasMethodLevelPreAuthorize = method.isAnnotationPresent(PreAuthorize.class);
                    boolean isWhitelisted = WHITELISTED_METHODS.contains(method.getName());

                    if (!hasClassLevelPreAuthorize && !hasMethodLevelPreAuthorize && !isWhitelisted) {
                        errors.append(String.format("Missing @PreAuthorize on class: %s, method: %s\n",
                                clazz.getSimpleName(), method.getName()));
                    }
                }
            }
        }

        if (errors.length() > 0) {
            fail("Found endpoints missing @PreAuthorize and not whitelisted:\n" + errors.toString());
        }
    }

    private boolean isMappingMethod(Method method) {
        return method.isAnnotationPresent(GetMapping.class) ||
               method.isAnnotationPresent(PostMapping.class) ||
               method.isAnnotationPresent(PutMapping.class) ||
               method.isAnnotationPresent(PatchMapping.class) ||
               method.isAnnotationPresent(DeleteMapping.class) ||
               method.isAnnotationPresent(RequestMapping.class);
    }
}
