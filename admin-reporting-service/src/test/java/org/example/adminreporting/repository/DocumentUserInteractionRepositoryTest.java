package org.example.adminreporting.repository;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.LocalDateTime;
import org.example.adminreporting.entity.Document;
import org.example.adminreporting.entity.DocumentUserInteraction;
import org.example.adminreporting.entity.DocumentUserInteractionId;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.data.domain.PageRequest;
import org.springframework.test.context.TestPropertySource;

@DataJpaTest
@TestPropertySource(properties = {
        "spring.flyway.enabled=false",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.jpa.properties.hibernate.dialect=org.hibernate.dialect.H2Dialect",
        "spring.test.database.replace=NONE",
        "spring.datasource.url=jdbc:h2:mem:document-interactions;MODE=MySQL;DB_CLOSE_DELAY=-1",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.datasource.username=sa",
        "spring.datasource.password="
})
class DocumentUserInteractionRepositoryTest {

    @Autowired
    private DocumentRepository documentRepository;

    @Autowired
    private DocumentUserInteractionRepository interactionRepository;

    @Test
    void favoriteAndRecentQueriesAreScopedToCurrentUser() {
        Document document = documentRepository.saveAndFlush(Document.builder()
                .title("Sổ tay nhận diện bệnh lúa")
                .url("https://example.test/rice-disease")
                .description("Hướng dẫn nhận diện và xử lý")
                .crop("Rice")
                .stage("Growing")
                .topic("Pest Management")
                .documentType("GUIDE")
                .isActive(true)
                .isPublic(true)
                .viewCount(0)
                .isPinned(false)
                .build());
        interactionRepository.saveAndFlush(DocumentUserInteraction.builder()
                .id(new DocumentUserInteractionId(42L, document.getDocumentId()))
                .document(document)
                .favorite(true)
                .favoritedAt(LocalDateTime.of(2026, 8, 24, 8, 0))
                .lastOpenedAt(LocalDateTime.of(2026, 8, 25, 9, 0))
                .openCount(1)
                .build());

        assertThat(interactionRepository.findFavoriteDocuments(
                42L, null, "GUIDE", "Rice", null, null, PageRequest.of(0, 20)).getContent())
                .extracting(Document::getDocumentId)
                .containsExactly(document.getDocumentId());
        assertThat(interactionRepository.findRecentDocuments(
                42L, null, null, null, null, null, PageRequest.of(0, 20)).getContent())
                .extracting(Document::getDocumentId)
                .containsExactly(document.getDocumentId());
        assertThat(interactionRepository.findFavoriteDocuments(
                99L, null, null, null, null, null, PageRequest.of(0, 20)))
                .isEmpty();
        assertThat(interactionRepository.findRecentDocuments(
                99L, null, null, null, null, null, PageRequest.of(0, 20)))
                .isEmpty();
    }
}
