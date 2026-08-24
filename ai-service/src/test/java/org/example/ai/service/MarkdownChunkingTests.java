package org.example.ai.service;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.ai.document.Document;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

public class MarkdownChunkingTests {

    @TempDir
    Path tempDir;

    @Test
    public void testMarkdownHeadingChunksPreserveRequiredMetadata() throws Exception {
        Path dataDir = tempDir.resolve("data");
        Path fileDir = dataDir.resolve("vietgap");
        Files.createDirectories(fileDir);
        Path filePath = fileDir.resolve("sample.md");
        
        String content = "# Tai lieu VietGAP\n\n" +
                "Mo dau.\n\n" +
                "## Nguon nuoc\n\n" +
                "Nuoc tuoi can an toan.\n\n" +
                "### Kiem tra nuoc\n\n" +
                "Can ghi chep ket qua kiem tra.";
        Files.writeString(filePath, content);

        List<Document> chunks = MarkdownChunker.buildDocumentChunks(filePath, dataDir);

        assertTrue(chunks.stream().anyMatch(d -> "Nguon nuoc".equals(d.getMetadata().get("heading"))));
        assertTrue(chunks.stream().anyMatch(d -> "Kiem tra nuoc".equals(d.getMetadata().get("heading"))));

        Document waterChunk = chunks.stream().filter(d -> "Nguon nuoc".equals(d.getMetadata().get("heading"))).findFirst().get();
        assertEquals("vietgap", waterChunk.getMetadata().get("category"));
        assertEquals("data/vietgap/sample.md", waterChunk.getMetadata().get("source"));
        assertEquals("sample.md", waterChunk.getMetadata().get("file_name"));
        assertTrue(waterChunk.getMetadata().get("chunk_id").toString().startsWith("vietgap:data/vietgap/sample.md:"));
        assertTrue(waterChunk.getText().contains("Nuoc tuoi can an toan"));
    }

    @Test
    public void testUnknownFolderCategoryFallsBackToUnknown() throws Exception {
        Path dataDir = tempDir.resolve("data");
        Path fileDir = dataDir.resolve("misc");
        Files.createDirectories(fileDir);
        Path filePath = fileDir.resolve("note.md");
        Files.writeString(filePath, "## Tieu de\n\nNoi dung.");

        List<Document> chunks = MarkdownChunker.buildDocumentChunks(filePath, dataDir);
        assertEquals("unknown", chunks.get(0).getMetadata().get("category"));
    }
}
