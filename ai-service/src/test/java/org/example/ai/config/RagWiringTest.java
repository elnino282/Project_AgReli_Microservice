package org.example.ai.config;

import org.example.ai.AiApplication;
import org.junit.jupiter.api.Test;
import org.springframework.ai.vectorstore.chroma.autoconfigure.ChromaVectorStoreAutoConfiguration;
import org.springframework.boot.autoconfigure.SpringBootApplication;

import java.util.Arrays;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class RagWiringTest {

    @Test
    void applicationDoesNotExcludeChromaAndConfigHasNoDummyBeans() {
        SpringBootApplication annotation = AiApplication.class.getAnnotation(SpringBootApplication.class);

        assertThat(Arrays.asList(annotation.exclude()))
                .doesNotContain(ChromaVectorStoreAutoConfiguration.class);
        assertThat(Arrays.stream(AiConfig.class.getDeclaredMethods()).map(method -> method.getName()))
                .noneMatch(name -> name.toLowerCase().contains("dummy"));
    }

    @Test
    void embeddingFailsClosedWhenApiKeyIsMissing() {
        GeminiEmbeddingModel model = new GeminiEmbeddingModel("", null, "text-embedding-004");

        assertThatThrownBy(() -> model.embed("VietGAP"))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("API key");
    }
}
