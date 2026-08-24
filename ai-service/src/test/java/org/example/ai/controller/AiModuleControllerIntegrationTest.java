package org.example.ai.controller;

import static org.hamcrest.Matchers.containsString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.example.ai.service.GeminiService;
import org.example.ai.service.RagChatResult;
import org.junit.jupiter.api.Test;
import java.util.List;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(controllers = { AiController.class, ChatController.class })
@Import(AiModuleControllerIntegrationTest.MethodSecurityTestConfig.class)
class AiModuleControllerIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private GeminiService geminiService;

    @TestConfiguration
    @EnableMethodSecurity
    static class MethodSecurityTestConfig {
    }

    @Test
    @WithMockUser(roles = "FARMER")
    void chat_returnsAssistantReply() throws Exception {
        when(geminiService.chatAsAgriculturalExpertWithSources(eq("How to improve soil?"), eq("rice")))
                .thenReturn(new RagChatResult(
                        "Use compost and rotate crops.",
                        List.of(new RagChatResult.RagSource(
                                "vietgap.md", "Soil", 3, "Use mature compost."))));

        mockMvc.perform(post("/api/v1/farmer/ai/chat")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "userMessage": "How to improve soil?",
                                  "cropContext": "rice"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.result.userMessage").value("How to improve soil?"))
                .andExpect(jsonPath("$.result.cropContext").value("rice"))
                .andExpect(jsonPath("$.result.assistantMessage").value("Use compost and rotate crops."))
                .andExpect(jsonPath("$.result.sources[0].file_name").value("vietgap.md"))
                .andExpect(jsonPath("$.result.sources[0].heading").value("Soil"))
                .andExpect(jsonPath("$.result.sources[0].page").value(3))
                .andExpect(jsonPath("$.result.sources[0].snippet").value("Use mature compost."));
    }

    @Test
    @WithMockUser(roles = "BUYER")
    void buyerChat_returnsAssistantReply() throws Exception {
        when(geminiService.chatAsBuyerProcurementExpertWithSources(eq("Should I buy this lot?"), eq("black beans")))
                .thenReturn(new RagChatResult(
                        "Check traceability and delivery terms.",
                        List.of(new RagChatResult.RagSource(
                                "traceability.md", "Lot verification", null, "Verify the public trace."))));

        mockMvc.perform(post("/api/v1/buyer/ai/chat")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "userMessage": "Should I buy this lot?",
                                  "buyerContext": "black beans"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.result.userMessage").value("Should I buy this lot?"))
                .andExpect(jsonPath("$.result.buyerContext").value("black beans"))
                .andExpect(jsonPath("$.result.assistantMessage").value("Check traceability and delivery terms."))
                .andExpect(jsonPath("$.result.sources[0].file_name").value("traceability.md"));
    }

    @Test
    @WithMockUser(roles = "FARMER")
    void buyerChat_rejectsFarmerRole() throws Exception {
        mockMvc.perform(post("/api/v1/buyer/ai/chat")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "userMessage": "Should I buy this lot?",
                                  "buyerContext": "black beans"
                                }
                                """))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(roles = "BUYER")
    void farmerChat_rejectsBuyerRole() throws Exception {
        mockMvc.perform(post("/api/v1/farmer/ai/chat")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "userMessage": "How to improve soil?",
                                  "cropContext": "rice"
                                }
                                """))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(roles = "BUYER")
    void buyerChat_rejectsBlankMessage() throws Exception {
        mockMvc.perform(post("/api/v1/buyer/ai/chat")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "userMessage": "   ",
                                  "buyerContext": "black beans"
                                }
                                """))
                .andExpect(status().isBadRequest());
    }

    @Test
    @WithMockUser(roles = "BUYER")
    void qa_delegatesToBuyerGeminiServiceForCompatibility() throws Exception {
        when(geminiService.chatAsBuyerProcurementExpert(eq("Should I buy this lot?"), isNull()))
                .thenReturn("Check seller reputation.");

        mockMvc.perform(get("/api/v1/ai/qa")
                        .param("question", "Should I buy this lot?"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.result.question").value("Should I buy this lot?"))
                .andExpect(jsonPath("$.result.answer").value("Check seller reputation."));
    }
}
