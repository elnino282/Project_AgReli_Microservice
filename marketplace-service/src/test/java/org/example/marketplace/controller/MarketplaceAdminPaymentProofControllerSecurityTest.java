package org.example.marketplace.controller;

import org.example.marketplace.config.SecurityConfig;
import org.example.marketplace.service.MarketplaceService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;
import org.example.marketplace.config.CustomJwtDecoder;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(MarketplaceAdminPaymentProofController.class)
@Import(SecurityConfig.class)
public class MarketplaceAdminPaymentProofControllerSecurityTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private MarketplaceService marketplaceService;

    @MockBean
    private CustomJwtDecoder customJwtDecoder;

    @Test
    @WithMockUser(roles = "BUYER")
    public void testVerifyPaymentProof_AsBuyer_ReturnsForbidden() throws Exception {
        mockMvc.perform(patch("/api/v1/admin/marketplace/payment-proofs/1/verify"))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    public void testVerifyPaymentProof_AsAdmin_ReturnsOk() throws Exception {
        mockMvc.perform(patch("/api/v1/admin/marketplace/payment-proofs/1/verify"))
                .andExpect(status().isOk());
    }
}
