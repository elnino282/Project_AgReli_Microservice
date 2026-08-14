package org.example.cropcatalog.controller;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.example.cropcatalog.config.CustomJwtDecoder;
import org.example.cropcatalog.config.SecurityConfig;
import org.example.cropcatalog.service.VarietyService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(AdminVarietyController.class)
@Import(SecurityConfig.class)
class AdminVarietyControllerSecurityTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private VarietyService varietyService;

    @MockBean
    private CustomJwtDecoder customJwtDecoder;

    @Test
    void anonymousCannotDeleteVariety() throws Exception {
        mockMvc.perform(delete("/api/v1/admin/varieties/7"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @WithMockUser(roles = "FARMER")
    void wrongRoleCannotDeleteVariety() throws Exception {
        mockMvc.perform(delete("/api/v1/admin/varieties/7"))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void adminCanDeleteVariety() throws Exception {
        mockMvc.perform(delete("/api/v1/admin/varieties/7"))
                .andExpect(status().isOk());
    }
}
