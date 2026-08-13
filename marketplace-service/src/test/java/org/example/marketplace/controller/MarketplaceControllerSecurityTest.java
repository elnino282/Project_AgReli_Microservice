package org.example.marketplace.controller;

import org.example.marketplace.config.CustomJwtDecoder;
import org.example.marketplace.config.SecurityConfig;
import org.example.marketplace.dto.request.MarketplaceCreateOrderRequest;
import org.example.marketplace.service.MarketplaceProductImageStorageService;
import org.example.marketplace.service.MarketplaceService;
import org.example.marketplace.service.MarketplaceStorageService;
import org.example.marketplace.shared.security.CurrentUserService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest({
        MarketplaceController.class,
        MarketplaceFarmerController.class,
        MarketplaceBuyerOrderAliasController.class,
        MarketplaceAdminController.class
})
@Import(SecurityConfig.class)
public class MarketplaceControllerSecurityTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private MarketplaceService marketplaceService;

    @MockBean
    private MarketplaceProductImageStorageService productImageStorageService;

    @MockBean
    private CustomJwtDecoder customJwtDecoder;

    @MockBean
    private MarketplaceStorageService storageService;

    @MockBean
    private CurrentUserService currentUserService;

    // --- 1. Endpoint public (Không token) ---
    @Test
    public void testGetProducts_Public_ReturnsOk() throws Exception {
        mockMvc.perform(get("/api/v1/marketplace/products"))
                .andExpect(status().isOk());
    }

    // --- 2. Endpoint ADMIN đại diện ---
    @Test
    @WithMockUser(roles = "ADMIN")
    public void testAdminEndpoint_AsAdmin_ReturnsOk() throws Exception {
        mockMvc.perform(get("/api/v1/marketplace/admin/products"))
                .andExpect(status().isOk());
    }

    @Test
    @WithMockUser(roles = "FARMER")
    public void testAdminEndpoint_AsFarmer_ReturnsForbidden() throws Exception {
        mockMvc.perform(get("/api/v1/marketplace/admin/products"))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(roles = "BUYER")
    public void testAdminEndpoint_AsBuyer_ReturnsForbidden() throws Exception {
        mockMvc.perform(get("/api/v1/marketplace/admin/products"))
                .andExpect(status().isForbidden());
    }

    @Test
    public void testAdminEndpoint_NoToken_ReturnsUnauthorizedOrForbidden() throws Exception {
        mockMvc.perform(get("/api/v1/marketplace/admin/products"))
                // Spring security without token might return 401 or 403 depending on entry point
                .andExpect(status().is4xxClientError());
    }

    // --- 3. Endpoint FARMER đại diện ---
    @Test
    @WithMockUser(roles = "FARMER")
    public void testFarmerEndpoint_AsFarmer_ReturnsOk() throws Exception {
        mockMvc.perform(get("/api/v1/marketplace/farmer/dashboard"))
                .andExpect(status().isOk());
    }

    @Test
    @WithMockUser(roles = "BUYER")
    public void testFarmerEndpoint_AsBuyer_ReturnsForbidden() throws Exception {
        mockMvc.perform(get("/api/v1/marketplace/farmer/dashboard"))
                .andExpect(status().isForbidden());
    }

    @Test
    public void testFarmerEndpoint_NoToken_Returns4xx() throws Exception {
        mockMvc.perform(get("/api/v1/marketplace/farmer/dashboard"))
                .andExpect(status().is4xxClientError());
    }

    // --- 4. Endpoint BUYER đại diện ---
    @Test
    @WithMockUser(roles = "BUYER")
    public void testBuyerEndpoint_AsBuyer_ReturnsOk() throws Exception {
        mockMvc.perform(get("/api/v1/marketplace/cart"))
                .andExpect(status().isOk());
    }

    @Test
    @WithMockUser(roles = "FARMER")
    public void testBuyerEndpoint_AsFarmer_ReturnsForbidden() throws Exception {
        mockMvc.perform(get("/api/v1/marketplace/cart"))
                .andExpect(status().isForbidden());
    }

    @Test
    public void testBuyerEndpoint_NoToken_Returns4xx() throws Exception {
        mockMvc.perform(get("/api/v1/marketplace/cart"))
                .andExpect(status().is4xxClientError());
    }
}
