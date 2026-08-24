package org.example.ai.service;

import java.util.List;

public record RagChatResult(String assistantMessage, List<RagSource> sources) {

    public RagChatResult {
        sources = sources == null ? List.of() : List.copyOf(sources);
    }

    public record RagSource(String fileName, String heading, Integer page, String snippet) {
    }
}
