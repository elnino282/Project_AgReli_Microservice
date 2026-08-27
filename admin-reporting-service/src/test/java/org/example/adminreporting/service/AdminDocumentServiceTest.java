package org.example.adminreporting.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import org.example.adminreporting.dto.PageResponse;
import org.example.adminreporting.dto.response.AdminDocumentResponse;
import org.example.adminreporting.entity.Document;
import org.example.adminreporting.entity.DocumentUserInteraction;
import org.example.adminreporting.entity.DocumentUserInteractionId;
import org.example.adminreporting.repository.DocumentRepository;
import org.example.adminreporting.repository.DocumentUserInteractionRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;

@ExtendWith(MockitoExtension.class)
class AdminDocumentServiceTest {

    @Mock
    private DocumentRepository documentRepository;

    @Mock
    private DocumentUserInteractionRepository interactionRepository;

    private AdminDocumentService service;
    private Document document;

    @BeforeEach
    void setUp() {
        service = new AdminDocumentService(documentRepository, interactionRepository);
        document = Document.builder()
                .documentId(7)
                .title("Quy trình canh tác lúa")
                .url("https://example.test/rice-guide")
                .documentType("GUIDE")
                .isActive(true)
                .isPublic(true)
                .viewCount(10)
                .build();
    }

    @Test
    void favoritesTabUsesPerUserFavoritesAndMarksResponse() {
        when(interactionRepository.findFavoriteDocuments(
                eq(42L), any(), any(), any(), any(), any(), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(document)));
        when(interactionRepository.findFavoriteDocumentIds(42L, List.of(7)))
                .thenReturn(List.of(7));

        PageResponse<AdminDocumentResponse> response = service.listPublicDocuments(
                42L, 0, 20, "favorites", null, null, null, null, null, "NEWEST");

        assertThat(response.getItems()).hasSize(1);
        assertThat(response.getItems().getFirst().getIsFavorited()).isTrue();
        verify(documentRepository, never()).findAllVisible(
                any(), any(), any(), any(), any(), any(Pageable.class));
    }

    @Test
    void recentTabUsesOnlyUserAccessHistory() {
        when(interactionRepository.findRecentDocuments(
                eq(42L), any(), any(), any(), any(), any(), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(document)));
        when(interactionRepository.findFavoriteDocumentIds(42L, List.of(7)))
                .thenReturn(List.of());

        PageResponse<AdminDocumentResponse> response = service.listPublicDocuments(
                42L, 0, 20, "recent", null, null, null, null, null, "NEWEST");

        assertThat(response.getItems()).extracting(AdminDocumentResponse::getDocumentId)
                .containsExactly(7L);
        assertThat(response.getItems().getFirst().getIsFavorited()).isFalse();
    }

    @Test
    void openingDocumentCreatesRecentInteractionAndIncrementsViewCount() {
        when(documentRepository.findVisibleById(7)).thenReturn(Optional.of(document));
        when(interactionRepository.findById(new DocumentUserInteractionId(42L, 7)))
                .thenReturn(Optional.empty());

        service.recordDocumentOpen(7, 42L);

        ArgumentCaptor<DocumentUserInteraction> captor =
                ArgumentCaptor.forClass(DocumentUserInteraction.class);
        verify(interactionRepository).save(captor.capture());
        assertThat(captor.getValue().getLastOpenedAt()).isNotNull();
        assertThat(captor.getValue().getOpenCount()).isEqualTo(1);
        assertThat(captor.getValue().getFavorite()).isFalse();
        verify(documentRepository).incrementViewCount(7);
    }

    @Test
    void removingFavoritePreservesRecentHistory() {
        LocalDateTime openedAt = LocalDateTime.of(2026, 8, 24, 9, 30);
        DocumentUserInteraction interaction = DocumentUserInteraction.builder()
                .id(new DocumentUserInteractionId(42L, 7))
                .document(document)
                .favorite(true)
                .favoritedAt(LocalDateTime.of(2026, 8, 23, 8, 0))
                .lastOpenedAt(openedAt)
                .openCount(3)
                .build();
        when(documentRepository.findVisibleById(7)).thenReturn(Optional.of(document));
        when(interactionRepository.findById(new DocumentUserInteractionId(42L, 7)))
                .thenReturn(Optional.of(interaction));

        service.removeFavorite(7, 42L);

        verify(interactionRepository).save(interaction);
        assertThat(interaction.getFavorite()).isFalse();
        assertThat(interaction.getFavoritedAt()).isNull();
        assertThat(interaction.getLastOpenedAt()).isEqualTo(openedAt);
        assertThat(interaction.getOpenCount()).isEqualTo(3);
    }
}
