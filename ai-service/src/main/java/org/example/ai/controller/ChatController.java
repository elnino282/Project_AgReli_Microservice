package org.example.ai.controller;

import jakarta.validation.Valid;
import org.example.ai.dto.response.ApiResponse;
import org.example.ai.dto.request.BuyerChatRequest;
import org.example.ai.dto.request.ChatRequest;
import org.example.ai.dto.response.BuyerChatResponse;
import org.example.ai.dto.response.ChatResponse;
import org.example.ai.dto.response.ChatSourceResponse;
import org.example.ai.service.GeminiService;
import org.example.ai.service.RagChatResult;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1")
public class ChatController {

    private final GeminiService geminiService;

    public ChatController(GeminiService geminiService) {
        this.geminiService = geminiService;
    }

    @PreAuthorize("hasRole('FARMER')")
    @PostMapping("/farmer/ai/chat")
    public ApiResponse<ChatResponse> chat(@Valid @RequestBody ChatRequest request) {
        RagChatResult reply = geminiService.chatAsAgriculturalExpertWithSources(
                request.getUserMessage(),
                request.getCropContext()
        );

        ChatResponse response = ChatResponse.builder()
                .userMessage(request.getUserMessage())
                .cropContext(request.getCropContext())
                .assistantMessage(reply.assistantMessage())
                .sources(reply.sources().stream().map(ChatController::toResponse).toList())
                .build();

        return ApiResponse.success(response);
    }

    @PreAuthorize("hasRole('BUYER')")
    @PostMapping("/buyer/ai/chat")
    public ApiResponse<BuyerChatResponse> buyerChat(@Valid @RequestBody BuyerChatRequest request) {
        RagChatResult reply = geminiService.chatAsBuyerProcurementExpertWithSources(
                request.getUserMessage(),
                request.getBuyerContext()
        );

        BuyerChatResponse response = BuyerChatResponse.builder()
                .userMessage(request.getUserMessage())
                .buyerContext(request.getBuyerContext())
                .assistantMessage(reply.assistantMessage())
                .sources(reply.sources().stream().map(ChatController::toResponse).toList())
                .build();

        return ApiResponse.success(response);
    }

    private static ChatSourceResponse toResponse(RagChatResult.RagSource source) {
        return ChatSourceResponse.builder()
                .fileName(source.fileName())
                .heading(source.heading())
                .page(source.page())
                .snippet(source.snippet())
                .build();
    }
}
