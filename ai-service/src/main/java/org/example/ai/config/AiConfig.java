package org.example.ai.config;

import org.springframework.ai.embedding.EmbeddingModel;
import org.springframework.ai.chroma.vectorstore.ChromaApi;
import org.springframework.ai.chroma.vectorstore.ChromaVectorStore;
import org.springframework.ai.vectorstore.chroma.autoconfigure.ChromaVectorStoreProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.env.Environment;
import org.springframework.web.client.HttpClientErrorException;

@Configuration
public class AiConfig {

    @Bean
    public EmbeddingModel geminiEmbeddingModel(AppProperties appProperties, Environment environment) {
        AppProperties.Ai ai = appProperties.getAi();
        String apiKey = firstNonBlank(
                ai.getApiKey(),
                environment.getProperty("APP_AI_API_KEY"),
                environment.getProperty("GEMINI_API_KEY"),
                environment.getProperty("GOOGLE_API_KEY"));

        return new GeminiEmbeddingModel(apiKey, ai.getBaseUrl(), ai.getEmbeddingModel());
    }

    @Bean
    public ChromaVectorStore chromaVectorStore(
            ChromaApi chromaApi,
            EmbeddingModel embeddingModel,
            ChromaVectorStoreProperties properties) {
        ensureCollectionExists(chromaApi, properties);
        return ChromaVectorStore.builder(chromaApi, embeddingModel)
                .tenantName(properties.getTenantName())
                .databaseName(properties.getDatabaseName())
                .collectionName(properties.getCollectionName())
                .initializeSchema(false)
                .build();
    }

    private static void ensureCollectionExists(
            ChromaApi chromaApi,
            ChromaVectorStoreProperties properties) {
        ensureTenantExists(chromaApi, properties.getTenantName());
        ensureDatabaseExists(chromaApi, properties.getTenantName(), properties.getDatabaseName());
        try {
            ChromaApi.Collection collection = chromaApi.getCollection(
                    properties.getTenantName(),
                    properties.getDatabaseName(),
                    properties.getCollectionName());
            if (collection == null) {
                createCollection(chromaApi, properties);
            }
        } catch (RuntimeException failure) {
            if (!isMissingResource(failure)) {
                throw failure;
            }
            createCollection(chromaApi, properties);
        }
    }

    private static void ensureTenantExists(ChromaApi chromaApi, String tenantName) {
        try {
            if (chromaApi.getTenant(tenantName) == null) {
                chromaApi.createTenant(tenantName);
            }
        } catch (RuntimeException failure) {
            if (!isMissingResource(failure)) {
                throw failure;
            }
            chromaApi.createTenant(tenantName);
        }
    }

    private static void ensureDatabaseExists(ChromaApi chromaApi, String tenantName, String databaseName) {
        try {
            if (chromaApi.getDatabase(tenantName, databaseName) == null) {
                chromaApi.createDatabase(tenantName, databaseName);
            }
        } catch (RuntimeException failure) {
            if (!isMissingResource(failure)) {
                throw failure;
            }
            chromaApi.createDatabase(tenantName, databaseName);
        }
    }

    private static void createCollection(ChromaApi chromaApi, ChromaVectorStoreProperties properties) {
        chromaApi.createCollection(
                properties.getTenantName(),
                properties.getDatabaseName(),
                new ChromaApi.CreateCollectionRequest(properties.getCollectionName()));
    }

    private static boolean isMissingResource(Throwable failure) {
        Throwable current = failure;
        while (current != null) {
            if (current instanceof HttpClientErrorException.NotFound) {
                return true;
            }
            if (current instanceof HttpClientErrorException.BadRequest badRequest
                    && badRequest.getResponseBodyAsString().contains("does not exist")) {
                return true;
            }
            current = current.getCause();
        }
        return false;
    }

    private static String firstNonBlank(String... values) {
        for (String value : values) {
            if (value != null && !value.isBlank()) {
                return value;
            }
        }
        return null;
    }
}
