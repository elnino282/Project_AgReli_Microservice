package org.example.season.controller;

import static org.assertj.core.api.Assertions.assertThat;

import java.lang.reflect.Method;
import java.util.Arrays;
import org.junit.jupiter.api.Test;
import org.springframework.web.bind.annotation.GetMapping;

class PlotDependencyContractTest {

    @Test
    void exposesSingleInternalPlotDependencyGuard() {
        Method method = Arrays.stream(InternalSeasonController.class.getDeclaredMethods())
                .filter(candidate -> candidate.getName().equals("getPlotDependencies"))
                .findFirst()
                .orElseThrow(() -> new AssertionError("Missing aggregate plot dependency endpoint"));

        GetMapping mapping = method.getAnnotation(GetMapping.class);
        assertThat(mapping).isNotNull();
        assertThat(mapping.value()).containsExactly("/plots/{plotId}/dependencies");
    }
}
