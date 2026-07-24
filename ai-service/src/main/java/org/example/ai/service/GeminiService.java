package org.example.ai.service;

import com.google.genai.Client;
import com.google.genai.errors.ApiException;
import com.google.genai.errors.GenAiIOException;
import com.google.genai.types.Content;
import com.google.genai.types.GenerateContentConfig;
import com.google.genai.types.GenerateContentResponse;
import com.google.genai.types.HttpOptions;
import com.google.genai.types.Part;
import jakarta.annotation.PostConstruct;
import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.HashMap;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import org.example.ai.config.AppProperties;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.env.Environment;
import org.springframework.core.env.Profiles;
import org.springframework.ai.document.Document;
import org.springframework.ai.vectorstore.SearchRequest;
import org.springframework.ai.vectorstore.VectorStore;
import java.util.List;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;

@Service
public class GeminiService {

    private static final Logger log = LoggerFactory.getLogger(GeminiService.class);

    private static final String DEFAULT_MODEL = "gemini-2.5-flash";
    private static final String DEFAULT_BASE_URL = "https://generativelanguage.googleapis.com";
    private static final String API_VERSION = "v1beta";
    private static final String SYSTEM_PROMPT_RESOURCE = "prompts/system_prompt.txt";
    private static final String BUYER_SYSTEM_PROMPT_RESOURCE = "prompts/system_prompt_buyer.txt";
    private static final String SYSTEM_PROMPT = loadSystemPrompt(SYSTEM_PROMPT_RESOURCE);
    private static final String BUYER_SYSTEM_PROMPT = loadSystemPrompt(BUYER_SYSTEM_PROMPT_RESOURCE);
    private static final String[] API_KEY_ENV_KEYS = new String[] {
            "APP_AI_API_KEY",
            "GEMINI_API_KEY",
            "GOOGLE_API_KEY"
    };

    private static final String CONNECTION_FALLBACK_MESSAGE =
            "Hiện tại tôi không thể kết nối tới dịch vụ tư vấn nông nghiệp. Vui lòng thử lại sau.";
    private static final String EMPTY_RESPONSE_FALLBACK_MESSAGE =
            "Hiện tại tôi không thể tạo được câu trả lời. Vui lòng thử lại sau hoặc đặt câu hỏi khác liên quan đến nông nghiệp.";
    private static final String BUYER_CONNECTION_FALLBACK_MESSAGE =
            "Hiện tại tôi không thể kết nối tới dịch vụ tư vấn mua hàng. Vui lòng thử lại sau.";
    private static final String BUYER_EMPTY_RESPONSE_FALLBACK_MESSAGE =
            "Hiện tại tôi không thể tạo được câu trả lời. Vui lòng thử lại sau hoặc đặt câu hỏi khác liên quan đến mua nông sản.";
    private static final String CROP_CONTEXT_LABEL =
            "Thông tin mùa vụ hiện tại:\n";
    private static final String USER_QUESTION_LABEL =
            "Câu hỏi của nông dân: ";
    private static final String BUYER_CONTEXT_LABEL =
            "Thông tin mua hàng hiện tại:\n";
    private static final String BUYER_QUESTION_LABEL =
            "Câu hỏi của người mua: ";

    private final Client client;
    private final String model;
    private final String baseUrl;
    private final boolean apiKeyPresent;
    private final boolean aiEnabled;
    private final String apiKeySource;
    private final Environment environment;
    private final VectorStore vectorStore;
    private final QuestionRouter questionRouter;

    public GeminiService(AppProperties appProperties, Environment environment, org.springframework.beans.factory.ObjectProvider<VectorStore> vectorStoreProvider, QuestionRouter questionRouter) {
        this.questionRouter = questionRouter;
        this.vectorStore = vectorStoreProvider.getIfAvailable();
        this.environment = environment;
        AppProperties.Ai aiProps = appProperties.getAi();

        Client.Builder builder = new Client.Builder();

        this.baseUrl = resolveBaseUrl(aiProps);
        if (this.baseUrl != null) {
            HttpOptions httpOptions = HttpOptions.builder()
                    .baseUrl(this.baseUrl)
                    .build();
            builder = builder.httpOptions(httpOptions);
        }

        ApiKeyResolution apiKeyResolution = resolveApiKey(aiProps);
        String apiKey = apiKeyResolution.value;
        this.apiKeySource = apiKeyResolution.source;
        this.apiKeyPresent = apiKey != null && !apiKey.isBlank();
        this.aiEnabled = this.apiKeyPresent;
        if (this.apiKeyPresent) {
            builder = builder.apiKey(apiKey);
        }

        this.client = builder.build();
        this.model = resolveModel(aiProps);
    }

    @PostConstruct
    void logConfiguration() {
        if (!apiKeyPresent) {
            if (isDevProfile()) {
                log.warn("Gemini API key missing; AI features are disabled in this profile. Set APP_AI_API_KEY, GEMINI_API_KEY, or GOOGLE_API_KEY.");
            } else {
                throw new IllegalStateException("Gemini API key is required in non-dev profiles. Set APP_AI_API_KEY, GEMINI_API_KEY, or GOOGLE_API_KEY.");
            }
        }

        String effectiveBaseUrl = baseUrl != null ? baseUrl : DEFAULT_BASE_URL;
        log.info("Gemini configuration: baseUrl={}, model={}, apiVersion={}, apiKeyPresent={}, apiKeySource={}",
                effectiveBaseUrl, model, API_VERSION, apiKeyPresent, apiKeySource);
    }

    public String chatAsAgriculturalExpert(String userMessage, String cropContext) {
        return chatWithPrompt(
                userMessage,
                cropContext,
                SYSTEM_PROMPT,
                CROP_CONTEXT_LABEL,
                USER_QUESTION_LABEL,
                CONNECTION_FALLBACK_MESSAGE,
                EMPTY_RESPONSE_FALLBACK_MESSAGE
        );
    }

    public String chatAsBuyerProcurementExpert(String userMessage, String buyerContext) {
        return chatWithPrompt(
                userMessage,
                buyerContext,
                BUYER_SYSTEM_PROMPT,
                BUYER_CONTEXT_LABEL,
                BUYER_QUESTION_LABEL,
                BUYER_CONNECTION_FALLBACK_MESSAGE,
                BUYER_EMPTY_RESPONSE_FALLBACK_MESSAGE
        );
    }

    public String analyzeMarketplaceImage(byte[] imageBytes, String mimeType) {
        Objects.requireNonNull(imageBytes, "imageBytes must not be null");
        if (imageBytes.length == 0) {
            throw new IllegalArgumentException("imageBytes must not be empty");
        }
        if (mimeType == null || mimeType.isBlank()) {
            throw new IllegalArgumentException("mimeType must not be blank");
        }

        String requestId = UUID.randomUUID().toString();
        if (!aiEnabled) {
            log.warn("Gemini image analysis skipped because AI is disabled (requestId={}).", requestId);
            throw new IllegalStateException("Gemini image analysis is disabled");
        }

        GenerateContentConfig config = GenerateContentConfig.builder()
                .responseMimeType("application/json")
                .temperature(0.1F)
                .maxOutputTokens(1024)
                .build();
        Content content = Content.fromParts(
                Part.fromText(buildMarketplaceImagePrompt()),
                Part.fromBytes(imageBytes, mimeType));

        try {
            GenerateContentResponse response = client.models.generateContent(model, content, config);
            String finishReason = response.finishReason() == null ? null : response.finishReason().toString();
            if (finishReason != null && !"STOP".equalsIgnoreCase(finishReason)) {
                log.warn("Gemini image analysis finished with reason {} (requestId={}).", finishReason, requestId);
            }
            String text = response.text();
            if (text == null || text.isBlank()) {
                log.warn("Gemini image analysis response empty (requestId={}).", requestId);
                throw new IllegalStateException("Gemini image analysis returned an empty response");
            }
            return text;
        } catch (ApiException ex) {
            logApiException(requestId, ex);
            throw new IllegalStateException("Gemini image analysis API error", ex);
        } catch (GenAiIOException ex) {
            logIoException(requestId, ex);
            throw new IllegalStateException("Gemini image analysis IO error", ex);
        } catch (IllegalStateException ex) {
            throw ex;
        } catch (Exception ex) {
            logUnexpectedException(requestId, ex);
            throw new IllegalStateException("Gemini image analysis unexpected error", ex);
        }
    }

    public String diagnoseDisease(byte[] imageBytes, String mimeType) {
        Objects.requireNonNull(imageBytes, "imageBytes must not be null");
        if (imageBytes.length == 0) {
            throw new IllegalArgumentException("imageBytes must not be empty");
        }
        if (mimeType == null || mimeType.isBlank()) {
            throw new IllegalArgumentException("mimeType must not be blank");
        }

        String requestId = UUID.randomUUID().toString();
        if (!aiEnabled) {
            log.warn("Gemini disease diagnosis skipped because AI is disabled (requestId={}).", requestId);
            throw new IllegalStateException("Gemini image analysis is disabled");
        }

        GenerateContentConfig config = GenerateContentConfig.builder()
                .responseMimeType("application/json")
                .temperature(0.2F)
                .maxOutputTokens(1024)
                .build();
        Content content = Content.fromParts(
                Part.fromText(buildDiseaseDiagnosisPrompt()),
                Part.fromBytes(imageBytes, mimeType));

        try {
            GenerateContentResponse response = client.models.generateContent(model, content, config);
            String finishReason = response.finishReason() == null ? null : response.finishReason().toString();
            if (finishReason != null && !"STOP".equalsIgnoreCase(finishReason)) {
                log.warn("Gemini disease diagnosis finished with reason {} (requestId={}).", finishReason, requestId);
            }
            String text = response.text();
            if (text == null || text.isBlank()) {
                log.warn("Gemini disease diagnosis response empty (requestId={}).", requestId);
                throw new IllegalStateException("Gemini image analysis returned an empty response");
            }
            return text;
        } catch (ApiException ex) {
            logApiException(requestId, ex);
            throw new IllegalStateException("Gemini image analysis API error", ex);
        } catch (GenAiIOException ex) {
            logIoException(requestId, ex);
            throw new IllegalStateException("Gemini image analysis IO error", ex);
        } catch (Exception ex) {
            logUnexpectedException(requestId, ex);
            throw new IllegalStateException("Gemini image analysis unexpected error", ex);
        }
    }

    public String predictHarvestDate(org.example.ai.dto.request.PredictHarvestRequest request) {
        String requestId = UUID.randomUUID().toString();
        if (!aiEnabled) {
            log.warn("Gemini harvest prediction skipped because AI is disabled (requestId={}).", requestId);
            throw new IllegalStateException("Gemini AI is disabled");
        }

        String prompt = "Bạn là Kỹ sư Nông nghiệp (Agronomist). Hãy phân tích dữ liệu mùa vụ sau để dự đoán ngày thu hoạch.\n" +
                "Loại cây: " + request.getCropName() + "\n" +
                "Ngày trồng: " + request.getPlantingDate() + "\n" +
                "Thời gian sinh trưởng dự kiến: " + request.getExpectedGrowthDays() + " ngày\n";

        if (request.getRecentLogs() != null && !request.getRecentLogs().isEmpty()) {
            prompt += "Lịch sử dùng phân/thuốc gần nhất:\n";
            for (org.example.ai.dto.request.PredictHarvestRequest.FarmingLogDto logItem : request.getRecentLogs()) {
                prompt += "- " + logItem.getDate() + ": " + logItem.getActivityType() + " (" + logItem.getMaterialName() + ")";
                if (logItem.getPhiDays() != null) {
                    prompt += " - Cách ly (PHI): " + logItem.getPhiDays() + " ngày";
                }
                prompt += "\n";
            }
        }

        prompt += "\nHãy trả về kết quả dưới định dạng JSON bao gồm 3 trường:\n" +
                "1. predictedHarvestDate (Ngày thu hoạch ước tính, định dạng YYYY-MM-DD)\n" +
                "2. safeHarvestDate (Ngày thu hoạch an toàn sau khi đã trừ đi số ngày cách ly lớn nhất của lần phun thuốc cuối, định dạng YYYY-MM-DD)\n" +
                "3. recommendation (Lời khuyên canh tác, ví dụ: 'Cần ngừng bón phân đạm từ hôm nay', 'Có thể thu hoạch từ ngày X').";

        GenerateContentConfig config = GenerateContentConfig.builder()
                .responseMimeType("application/json")
                .temperature(0.1F)
                .maxOutputTokens(1024)
                .build();
                
        Content content = Content.fromParts(Part.fromText(prompt));

        try {
            GenerateContentResponse response = client.models.generateContent(model, content, config);
            String text = response.text();
            if (text == null || text.isBlank()) {
                throw new IllegalStateException("Empty response from Gemini");
            }
            return text;
        } catch (Exception ex) {
            logUnexpectedException(requestId, ex);
            throw new IllegalStateException("Gemini API error during harvest prediction", ex);
        }
    }

    private String chatWithPrompt(String userMessage,
                                  String context,
                                  String systemPrompt,
                                  String contextLabel,
                                  String questionLabel,
                                  String connectionFallbackMessage,
                                  String emptyResponseFallbackMessage) {
        Objects.requireNonNull(userMessage, "userMessage must not be null");
        if (userMessage.isBlank()) {
            throw new IllegalArgumentException("userMessage must not be blank");
        }

        if (this.questionRouter != null && this.questionRouter.route(userMessage) == QuestionRouter.RouteMode.OFF_TOPIC) {
            return "Xin lỗi, tôi chỉ có thể trả lời các câu hỏi liên quan đến nông nghiệp và nền tảng quản lý mùa vụ.";
        }

        String requestId = UUID.randomUUID().toString();
        if (!aiEnabled) {
            log.warn("Gemini request skipped because AI is disabled (requestId={}).", requestId);
            return connectionFallbackMessage;
        }
        
        String combinedContext = context != null ? context : "";
        if (this.vectorStore != null) {
            try {
                List<Document> documents = this.vectorStore.similaritySearch(
                        SearchRequest.query(userMessage).withTopK(5)
                );
                String ragContext = documents.stream()
                        .map(doc -> {
                            String heading = doc.getMetadata().containsKey("heading") ? doc.getMetadata().get("heading").toString() : "Tài liệu";
                            return "[TÀI LIỆU]\nTiêu đề: " + heading + "\n" + doc.getContent();
                        })
                        .collect(Collectors.joining("\n\n"));
                combinedContext += "\n\nThông tin tham khảo từ hệ thống (RAG):\n" + ragContext;
            } catch (Exception e) {
                log.warn("Failed to retrieve documents from VectorStore for RAG: {}", e.getMessage());
            }
        }

        String prompt = buildPrompt(userMessage, combinedContext, systemPrompt, contextLabel, questionLabel);

        try {
            GenerateContentResponse response = client.models.generateContent(model, prompt, null);
            String text = response.text();
            if (text == null || text.isBlank()) {
                log.warn("Gemini response empty (requestId={}).", requestId);
                return emptyResponseFallbackMessage;
            }
            return text;
        } catch (ApiException ex) {
            logApiException(requestId, ex);
            return connectionFallbackMessage;
        } catch (GenAiIOException ex) {
            logIoException(requestId, ex);
            return connectionFallbackMessage;
        } catch (Exception ex) {
            logUnexpectedException(requestId, ex);
            return connectionFallbackMessage;
        }
    }

    private String buildPrompt(String userMessage,
                               String context,
                               String systemPrompt,
                               String contextLabel,
                               String questionLabel) {
        StringBuilder sb = new StringBuilder();
        sb.append(systemPrompt).append("\n\n");
        if (context != null && !context.isBlank()) {
            sb.append(contextLabel);
            sb.append(context).append("\n\n");
        }
        sb.append(questionLabel);
        sb.append(userMessage);
        return sb.toString();
    }

    private String buildMarketplaceImagePrompt() {
        return """
                Analyze this image for buyer marketplace search.
                Return ONLY compact valid JSON. No Markdown, no prose.
                Identify agricultural marketplace products only: produce, seeds, crop inputs, harvested farm goods.
                Do not diagnose disease or recommend treatment.
                If unclear/non-agricultural/cannot comply: agricultural=false, confidence=0, arrays=[], Vietnamese message.
                {
                  "detectedProduct": "Vietnamese name or null",
                  "category": "short category or null",
                  "keywordsVi": ["max 4 Vietnamese search terms"],
                  "keywordsEn": ["max 4 English search terms"],
                  "keywords": ["max 5 best search terms"],
                  "visualAttributes": ["max 4 visual clues"],
                  "confidence": 0.0,
                  "confidenceLabel": "low|medium|high",
                  "agricultural": true,
                  "message": "short Vietnamese message"
                }
                """;
    }

    private String buildDiseaseDiagnosisPrompt() {
        return """
                Analyze this image of a plant/crop to diagnose any disease or pest.
                Return ONLY compact valid JSON. No Markdown, no prose.
                If the image is not a plant, or you cannot diagnose, set hasDisease to false.
                {
                  "hasDisease": true,
                  "diseaseName": "Tên bệnh/sâu (Tiếng Việt)",
                  "confidence": 0.95,
                  "suggestedPesticide": "Tên hoạt chất/thuốc đề xuất (Tiếng Việt)",
                  "estimatedPhiDays": 7,
                  "message": "Lời khuyên ngắn gọn (Tiếng Việt)"
                }
                """;
    }

    private String resolveBaseUrl(AppProperties.Ai aiProps) {
        if (aiProps == null || aiProps.getBaseUrl() == null || aiProps.getBaseUrl().isBlank()) {
            return null;
        }

        String baseUrlValue = aiProps.getBaseUrl().trim();
        if (baseUrlValue.endsWith("/")) {
            baseUrlValue = baseUrlValue.substring(0, baseUrlValue.length() - 1);
        }

        String versionSegment = "/" + API_VERSION;
        if (baseUrlValue.contains(versionSegment + versionSegment)) {
            throw new IllegalStateException("app.ai.base-url must not contain '" + versionSegment + versionSegment + "'. Use " + DEFAULT_BASE_URL + " instead.");
        }

        if (baseUrlValue.endsWith(versionSegment)) {
            log.warn("app.ai.base-url should not include '{}'; removing trailing version segment.", versionSegment);
            baseUrlValue = baseUrlValue.substring(0, baseUrlValue.length() - versionSegment.length());
        }

        if (baseUrlValue.contains(versionSegment + "/")) {
            log.warn("app.ai.base-url contains '{}' segment; removing to avoid double versioning.", versionSegment);
            baseUrlValue = baseUrlValue.replace(versionSegment + "/", "/");
        }

        if (baseUrlValue.contains(versionSegment + versionSegment)) {
            throw new IllegalStateException("app.ai.base-url normalized into an invalid path. Use " + DEFAULT_BASE_URL + " instead.");
        }

        return DEFAULT_BASE_URL.equals(baseUrlValue) ? null : baseUrlValue;
    }

    private ApiKeyResolution resolveApiKey(AppProperties.Ai aiProps) {
        if (aiProps != null && aiProps.getApiKey() != null && !aiProps.getApiKey().isBlank()) {
            return new ApiKeyResolution(aiProps.getApiKey().trim(), "app.ai.api-key");
        }

        String geminiApiKey = environment.getProperty("GEMINI_API_KEY");
        if (geminiApiKey != null && !geminiApiKey.isBlank()) {
            return new ApiKeyResolution(geminiApiKey.trim(), "GEMINI_API_KEY");
        }

        String googleApiKey = environment.getProperty("GOOGLE_API_KEY");
        if (googleApiKey != null && !googleApiKey.isBlank()) {
            return new ApiKeyResolution(googleApiKey.trim(), "GOOGLE_API_KEY");
        }

        if (isDevProfile()) {
            ApiKeyResolution dotenvResolution = resolveApiKeyFromDotenv();
            if (dotenvResolution != null) {
                return dotenvResolution;
            }
        }

        return new ApiKeyResolution(null, "missing");
    }

    private String resolveModel(AppProperties.Ai aiProps) {
        if (aiProps != null && aiProps.getModel() != null && !aiProps.getModel().isBlank()) {
            return aiProps.getModel().trim();
        }
        return DEFAULT_MODEL;
    }

    private boolean isDevProfile() {
        return environment.acceptsProfiles(Profiles.of("dev", "test", "local"));
    }

    private void logApiException(String requestId, ApiException ex) {
        int statusCode = ex.code();
        String status = ex.status();
        String errorMessage = ex.message();

        String guidance = switch (statusCode) {
            case 401, 403 -> "Invalid or missing API key.";
            case 404 -> "Endpoint not found; check base URL configuration.";
            case 429 -> "Quota or rate limit exceeded.";
            default -> statusCode >= 500 ? "Gemini service error." : "Unexpected Gemini API error.";
        };

        log.warn("Gemini API error (requestId={}, exceptionType={}, statusCode={}, status={}, message={}, guidance={})",
                requestId, ex.getClass().getSimpleName(), statusCode, status, errorMessage, guidance);
    }

    private void logIoException(String requestId, GenAiIOException ex) {
        Throwable cause = ex.getCause();
        String causeSummary = (cause != null)
                ? cause.getClass().getSimpleName() + ": " + cause.getMessage()
                : "n/a";

        log.warn("Gemini IO error (requestId={}, exceptionType={}, cause={})",
                requestId, ex.getClass().getSimpleName(), causeSummary);
    }

    private void logUnexpectedException(String requestId, Exception ex) {
        log.warn("Gemini unexpected error (requestId={}, exceptionType={}, exception={})",
                requestId, ex.getClass().getSimpleName(), ex.toString(), ex);
    }

    private static String loadSystemPrompt(String resourcePath) {
        try (InputStream input = GeminiService.class.getClassLoader().getResourceAsStream(resourcePath)) {
            if (input == null) {
                throw new IllegalStateException("Missing resource: " + resourcePath);
            }
            return new String(input.readAllBytes(), StandardCharsets.UTF_8).trim();
        } catch (IOException ex) {
            throw new IllegalStateException("Failed to load system prompt resource: " + resourcePath, ex);
        }
    }

    private ApiKeyResolution resolveApiKeyFromDotenv() {
        for (Path dotenvPath : resolveDotenvPaths()) {
            ApiKeyResolution resolution = parseDotenvForApiKey(dotenvPath);
            if (resolution != null && resolution.value != null && !resolution.value.isBlank()) {
                return resolution;
            }
        }
        return null;
    }

    private Path[] resolveDotenvPaths() {
        String userDir = System.getProperty("user.dir");
        return new Path[] {
                Path.of(userDir, ".env"),
                Path.of(userDir, "agricultural-crop-management-backend", ".env")
        };
    }

    private ApiKeyResolution parseDotenvForApiKey(Path path) {
        if (!Files.isRegularFile(path)) {
            return null;
        }

        Map<String, String> values = new HashMap<>();
        try (BufferedReader reader = Files.newBufferedReader(path, StandardCharsets.UTF_8)) {
            String line;
            while ((line = reader.readLine()) != null) {
                String trimmed = line.trim();
                if (trimmed.isEmpty() || trimmed.startsWith("#")) {
                    continue;
                }
                if (trimmed.startsWith("export ")) {
                    trimmed = trimmed.substring("export ".length()).trim();
                }
                int eqIndex = trimmed.indexOf('=');
                if (eqIndex <= 0) {
                    continue;
                }
                String key = trimmed.substring(0, eqIndex).trim();
                String value = trimmed.substring(eqIndex + 1).trim();
                if (value.isEmpty()) {
                    continue;
                }
                values.put(key, stripOptionalQuotes(value));
            }
        } catch (IOException ex) {
            log.warn("Failed to read .env file at {} ({}).", path, ex.toString());
            return null;
        }

        for (String key : API_KEY_ENV_KEYS) {
            String value = values.get(key);
            if (value != null && !value.isBlank()) {
                return new ApiKeyResolution(value.trim(), "dotenv:" + path);
            }
        }
        return null;
    }

    private String stripOptionalQuotes(String value) {
        String trimmed = value.trim();
        if ((trimmed.startsWith("\"") && trimmed.endsWith("\""))
                || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
            return trimmed.substring(1, trimmed.length() - 1);
        }
        return trimmed;
    }

    private static final class ApiKeyResolution {
        private final String value;
        private final String source;

        private ApiKeyResolution(String value, String source) {
            this.value = value;
            this.source = source;
        }
    }
}
