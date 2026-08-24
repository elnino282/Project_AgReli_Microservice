package org.example.ai.service;

import org.junit.jupiter.api.Test;
import org.springframework.ai.document.Document;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class RagSourceMappingTest {

    @Test
    void mapsSanitizedProvenanceAndCapsSnippet() {
        String content = "water ".repeat(60);
        Document document = new Document(content, Map.of(
                "source", "data/vietgap/water.md",
                "heading", "Irrigation safety",
                "page", "4"));

        RagChatResult.RagSource source = GeminiService.toRagSource(document);

        assertThat(source.fileName()).isEqualTo("water.md");
        assertThat(source.heading()).isEqualTo("Irrigation safety");
        assertThat(source.page()).isEqualTo(4);
        assertThat(source.snippet()).hasSizeLessThanOrEqualTo(243).endsWith("...");
    }
}
