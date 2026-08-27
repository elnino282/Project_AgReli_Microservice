package org.example.farm.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.*;

import java.math.BigDecimal;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateCertificationScopesRequest {
    @NotEmpty
    @Size(max = 50)
    private List<@Valid ScopeItem> scopes;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ScopeItem {
        @NotNull
        private Integer seasonId;

        @NotNull
        @DecimalMin(value = "0.0001")
        private BigDecimal registeredAreaHa;
    }
}
