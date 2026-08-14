package org.example.delivery.controller;

import org.example.delivery.config.CustomJwtDecoder;
import org.example.delivery.config.SecurityConfig;
import org.example.delivery.service.DeliveryService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(DeliveryController.class)
@Import(SecurityConfig.class)
class DeliveryControllerSecurityTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private DeliveryService deliveryService;

    @MockBean
    private CustomJwtDecoder customJwtDecoder;

    @Test
    void anonymousCannotListDeliveries() throws Exception {
        mockMvc.perform(get("/api/v1/delivery/orders"))
                .andExpect(status().is4xxClientError());
    }

    @Test
    @WithMockUser(roles = "FARMER")
    void farmerCannotListAllDeliveries() throws Exception {
        mockMvc.perform(get("/api/v1/delivery/orders"))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(roles = "BUYER")
    void buyerCanListOwnedDeliveries() throws Exception {
        mockMvc.perform(get("/api/v1/delivery/orders"))
                .andExpect(status().isOk());
    }

    @Test
    @WithMockUser(roles = "BUYER")
    void buyerCannotUpdateDeliveryStatus() throws Exception {
        mockMvc.perform(put("/api/v1/delivery/orders/1/status")
                        .param("status", "DELIVERED")
                        .with(csrf()))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void adminCanUpdateDeliveryStatus() throws Exception {
        mockMvc.perform(put("/api/v1/delivery/orders/1/status")
                        .param("status", "DELIVERED")
                        .with(csrf()))
                .andExpect(status().isOk());
    }

    @Test
    void anonymousCannotCreateDeliveryFromQuote() throws Exception {
        mockMvc.perform(post("/api/v1/delivery/orders")
                        .contentType(org.springframework.http.MediaType.APPLICATION_JSON)
                        .content("{\"marketplaceOrderId\":1,\"shippingQuoteId\":\"quote-1\"}"))
                .andExpect(status().is4xxClientError());
    }

    @Test
    @WithMockUser(roles = "FARMER")
    void farmerCannotCreateDeliveryFromQuote() throws Exception {
        mockMvc.perform(post("/api/v1/delivery/orders")
                        .contentType(org.springframework.http.MediaType.APPLICATION_JSON)
                        .content("{\"marketplaceOrderId\":1,\"shippingQuoteId\":\"quote-1\"}"))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(roles = "BUYER")
    void buyerCanCreateDeliveryFromQuote() throws Exception {
        mockMvc.perform(post("/api/v1/delivery/orders")
                        .contentType(org.springframework.http.MediaType.APPLICATION_JSON)
                        .content("{\"marketplaceOrderId\":1,\"shippingQuoteId\":\"quote-1\"}"))
                .andExpect(status().isOk());
    }
}
