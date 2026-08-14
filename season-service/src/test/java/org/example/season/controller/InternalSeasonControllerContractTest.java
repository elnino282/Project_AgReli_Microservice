package org.example.season.controller;

import static org.assertj.core.api.Assertions.assertThat;

import java.lang.reflect.Method;
import java.util.Arrays;
import org.junit.jupiter.api.Test;
import org.springframework.web.bind.annotation.GetMapping;

class InternalSeasonControllerContractTest {

    @Test
    void exposesInternalVarietyReferenceGuard() {
        Method method = Arrays.stream(InternalSeasonController.class.getDeclaredMethods())
                .filter(candidate -> candidate.getName().equals("existsByVariety"))
                .findFirst()
                .orElseThrow(() -> new AssertionError("Missing internal variety reference endpoint"));

        GetMapping mapping = method.getAnnotation(GetMapping.class);
        assertThat(mapping).isNotNull();
        assertThat(mapping.value()).containsExactly("/seasons/exists-by-variety/{varietyId}");
    }
}
