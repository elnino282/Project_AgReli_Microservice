package org.example.farm.controller;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.example.farm.config.CustomJwtDecoder;
import org.example.farm.config.SecurityConfig;
import org.example.farm.service.PlotService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(PlotController.class)
@Import(SecurityConfig.class)
class PlotControllerSecurityTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private PlotService plotService;

    @MockBean
    private CustomJwtDecoder customJwtDecoder;

    @Test
    void anonymousCannotDeletePlot() throws Exception {
        mockMvc.perform(delete("/api/v1/plots/12"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @WithMockUser(roles = "BUYER")
    void wrongRoleCannotDeletePlot() throws Exception {
        mockMvc.perform(delete("/api/v1/plots/12"))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(roles = "FARMER")
    void farmerCanReachDeletePlot() throws Exception {
        mockMvc.perform(delete("/api/v1/plots/12"))
                .andExpect(status().isOk());
    }
}
