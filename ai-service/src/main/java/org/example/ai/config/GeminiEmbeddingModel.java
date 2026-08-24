package org.example.ai.config;

import com.google.genai.Client;
import com.google.genai.types.ContentEmbedding;
import com.google.genai.types.EmbedContentConfig;
import com.google.genai.types.EmbedContentResponse;
import com.google.genai.types.HttpOptions;
import org.springframework.ai.document.Document;
import org.springframework.ai.embedding.Embedding;
import org.springframework.ai.embedding.EmbeddingModel;
import org.springframework.ai.embedding.EmbeddingRequest;
import org.springframework.ai.embedding.EmbeddingResponse;

import java.util.ArrayList;
import java.util.List;

/**
 * Real Spring AI embedding adapter backed by the same Gemini API used for chat.
 * Missing credentials fail at the first RAG operation instead of silently
 * returning zero vectors and reporting a fake ingestion success.
 */
public final class GeminiEmbeddingModel implements EmbeddingModel {

    private static final String DEFAULT_MODEL = "text-embedding-004";

    private final Client client;
    private final String model;
    private final boolean apiKeyPresent;

    public GeminiEmbeddingModel(String apiKey, String baseUrl, String model) {
        this.apiKeyPresent = apiKey != null && !apiKey.isBlank();
        this.model = model == null || model.isBlank() ? DEFAULT_MODEL : model;

        if (!apiKeyPresent) {
            this.client = null;
            return;
        }

        Client.Builder builder = Client.builder().apiKey(apiKey);
        if (baseUrl != null && !baseUrl.isBlank()) {
            builder.httpOptions(HttpOptions.builder().baseUrl(baseUrl).build());
        }
        this.client = builder.build();
    }

    @Override
    public EmbeddingResponse call(EmbeddingRequest request) {
        requireApiKey();
        List<String> instructions = request.getInstructions();
        if (instructions == null || instructions.isEmpty()) {
            return new EmbeddingResponse(List.of());
        }

        EmbedContentResponse response = client.models.embedContent(
                model,
                instructions,
                (EmbedContentConfig) null);
        List<ContentEmbedding> contentEmbeddings = response.embeddings()
                .orElseThrow(() -> new IllegalStateException("Gemini embedding response did not contain vectors"));
        if (contentEmbeddings.size() != instructions.size()) {
            throw new IllegalStateException("Gemini embedding response size did not match the request");
        }

        List<Embedding> embeddings = new ArrayList<>(contentEmbeddings.size());
        for (int index = 0; index < contentEmbeddings.size(); index++) {
            List<Float> values = contentEmbeddings.get(index).values()
                    .orElseThrow(() -> new IllegalStateException("Gemini embedding response contained an empty vector"));
            float[] vector = new float[values.size()];
            for (int valueIndex = 0; valueIndex < values.size(); valueIndex++) {
                vector[valueIndex] = values.get(valueIndex);
            }
            embeddings.add(new Embedding(vector, index));
        }
        return new EmbeddingResponse(embeddings);
    }

    @Override
    public float[] embed(Document document) {
        return embed(document.getText());
    }

    private void requireApiKey() {
        if (!apiKeyPresent) {
            throw new IllegalStateException("Gemini API key is required for RAG embedding");
        }
    }
}
