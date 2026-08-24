package org.example.farm.controller;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.List;
import org.example.farm.config.CurrentUserService;
import org.example.farm.config.CustomJwtDecoder;
import org.example.farm.config.SecurityConfig;
import org.example.farm.service.CertificationAuditService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(CertificationAuditController.class)
@Import(SecurityConfig.class)
class CertificationAuditControllerSecurityTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private CertificationAuditService auditService;

    @MockBean
    private CurrentUserService currentUserService;

    @MockBean
    private CustomJwtDecoder customJwtDecoder;

    @Test
    void anonymousCannotListAllCertificationAudits() throws Exception {
        mockMvc.perform(get("/api/v1/admin/certification-audits"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @WithMockUser(roles = "FARMER")
    void farmerCannotListAllCertificationAudits() throws Exception {
        mockMvc.perform(get("/api/v1/admin/certification-audits"))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void adminCanListAllCertificationAudits() throws Exception {
        when(auditService.getAllAuditsForAdmin()).thenReturn(List.of());

        mockMvc.perform(get("/api/v1/admin/certification-audits"))
                .andExpect(status().isOk());
    }
}
