package org.example.adminreporting.service;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import org.example.adminreporting.dto.PageResponse;
import org.example.adminreporting.dto.response.AdminDocumentResponse;
import org.example.adminreporting.entity.Document;
import org.example.adminreporting.entity.DocumentUserInteraction;
import org.example.adminreporting.entity.DocumentUserInteractionId;
import org.example.adminreporting.repository.DocumentRepository;
import org.example.adminreporting.repository.DocumentUserInteractionRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AdminDocumentService {

    private static final DateTimeFormatter DTF = DateTimeFormatter.ISO_LOCAL_DATE_TIME;

    private final DocumentRepository documentRepository;
    private final DocumentUserInteractionRepository documentUserInteractionRepository;

    @Transactional(readOnly = true)
    public PageResponse<AdminDocumentResponse> listPublicDocuments(
            Long userId,
            int page,
            int size,
            String tab,
            String q,
            String type,
            String crop,
            String stage,
            String topic,
            String sort) {
        String normalizedTab = tab == null ? "all" : tab.trim().toLowerCase();
        Page<Document> documentPage;

        if ("favorites".equals(normalizedTab)) {
            documentPage = documentUserInteractionRepository.findFavoriteDocuments(
                    userId, q, type, crop, stage, topic, PageRequest.of(page, size));
        } else if ("recent".equals(normalizedTab)) {
            documentPage = documentUserInteractionRepository.findRecentDocuments(
                    userId, q, type, crop, stage, topic, PageRequest.of(page, size));
        } else {
            documentPage = documentRepository.findAllVisible(
                    q, type, crop, stage, topic, createPageable(page, size, sort));
        }

        Set<Integer> favoriteIds = findFavoriteIds(userId, documentPage.getContent());
        List<AdminDocumentResponse> items = documentPage.getContent().stream()
                .map(document -> mapToResponse(document, favoriteIds.contains(document.getDocumentId())))
                .toList();
        return PageResponse.of(documentPage, items);
    }

    @Transactional(readOnly = true)
    public PageResponse<AdminDocumentResponse> listDocuments(
            int page,
            int size,
            String q,
            String type,
            String status,
            String sort) {

        Page<Document> documentPage = documentRepository.findAll(createPageable(page, size, sort));
        List<AdminDocumentResponse> items = documentPage.getContent().stream()
                .map(this::mapToResponse)
                .toList();
        return PageResponse.of(documentPage, items);
    }

    public org.example.adminreporting.dto.response.DocumentMetaResponse getDocumentMeta() {
        return org.example.adminreporting.dto.response.DocumentMetaResponse.builder()
                .types(List.of("GUIDE", "TEMPLATE", "ANNOUNCEMENT", "SYSTEM_HELP"))
                .stages(List.of("Planting", "Growing", "Harvest", "Post-Harvest"))
                .topics(List.of("Best Practices", "Pest Management", "Water Management", "Soil Management", "Farm Planning", "Climate Adaptation", "POLICY"))
                .crops(List.of(
                        new org.example.adminreporting.dto.response.DocumentMetaResponse.CropOption(1, "Rice"),
                        new org.example.adminreporting.dto.response.DocumentMetaResponse.CropOption(2, "Coffee"),
                        new org.example.adminreporting.dto.response.DocumentMetaResponse.CropOption(3, "Pepper")
                ))
                .build();
    }

    @Transactional(readOnly = true)
    public AdminDocumentResponse getDocumentById(Integer id) {
        Document doc = documentRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Document not found: " + id));
        return mapToResponse(doc);
    }

    @Transactional(readOnly = true)
    public AdminDocumentResponse getPublicDocumentById(Integer id, Long userId) {
        Document document = findVisibleDocument(id);
        boolean favorite = documentUserInteractionRepository
                .findById(new DocumentUserInteractionId(userId, id))
                .map(DocumentUserInteraction::getFavorite)
                .orElse(false);
        return mapToResponse(document, favorite);
    }

    @Transactional
    public void recordDocumentOpen(Integer id, Long userId) {
        Document document = findVisibleDocument(id);
        DocumentUserInteraction interaction = getOrCreateInteraction(userId, document);
        interaction.setLastOpenedAt(LocalDateTime.now());
        interaction.setOpenCount(interaction.getOpenCount() + 1);
        documentUserInteractionRepository.save(interaction);
        documentRepository.incrementViewCount(id);
    }

    @Transactional
    public void addFavorite(Integer id, Long userId) {
        Document document = findVisibleDocument(id);
        DocumentUserInteraction interaction = getOrCreateInteraction(userId, document);
        if (!Boolean.TRUE.equals(interaction.getFavorite())) {
            interaction.setFavorite(true);
            interaction.setFavoritedAt(LocalDateTime.now());
            documentUserInteractionRepository.save(interaction);
        }
    }

    @Transactional
    public void removeFavorite(Integer id, Long userId) {
        findVisibleDocument(id);
        documentUserInteractionRepository.findById(new DocumentUserInteractionId(userId, id))
                .ifPresent(interaction -> {
                    interaction.setFavorite(false);
                    interaction.setFavoritedAt(null);
                    documentUserInteractionRepository.save(interaction);
                });
    }

    @Transactional
    public AdminDocumentResponse createDocument(
            String title,
            String description,
            String documentUrl,
            String documentType,
            String status) {
        Document doc = Document.builder()
                .title(title)
                .description(description)
                .url(documentUrl)
                .topic(documentType)
                .isActive("ACTIVE".equalsIgnoreCase(status))
                .isPublic(true)
                .build();
        Document saved = documentRepository.save(doc);
        return mapToResponse(saved);
    }

    @Transactional
    public AdminDocumentResponse updateDocument(
            Integer id,
            String title,
            String description,
            String documentUrl,
            String documentType,
            String status) {
        Document doc = documentRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Document not found: " + id));
        doc.setTitle(title);
        doc.setDescription(description);
        doc.setUrl(documentUrl);
        doc.setTopic(documentType);
        doc.setIsActive("ACTIVE".equalsIgnoreCase(status));
        Document saved = documentRepository.save(doc);
        return mapToResponse(saved);
    }

    @Transactional
    public void softDeleteDocument(Integer id) {
        Document doc = documentRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Document not found: " + id));
        doc.setIsActive(false);
        documentRepository.save(doc);
    }

    @Transactional
    public void hardDeleteDocument(Integer id) {
        Document doc = documentRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Document not found: " + id));
        documentRepository.delete(doc);
    }

    private AdminDocumentResponse mapToResponse(Document doc) {
        return mapToResponse(doc, false);
    }

    private AdminDocumentResponse mapToResponse(Document doc, boolean favorite) {
        return AdminDocumentResponse.builder()
                .documentId(Long.valueOf(doc.getDocumentId()))
                .title(doc.getTitle())
                .url(doc.getUrl())
                .description(doc.getDescription())
                .crop(doc.getCrop())
                .stage(doc.getStage())
                .topic(doc.getTopic())
                .documentType(doc.getDocumentType())
                .viewCount(doc.getViewCount())
                .isPinned(doc.getIsPinned())
                .isActive(doc.getIsActive())
                .createdAt(doc.getCreatedAt() != null ? doc.getCreatedAt().format(DTF) : null)
                .updatedAt(doc.getUpdatedAt() != null ? doc.getUpdatedAt().format(DTF) : null)
                .createdBy(doc.getCreatedBy())
                .isFavorited(favorite)
                .isPublic(doc.getIsPublic())
                .build();
    }

    private Document findVisibleDocument(Integer id) {
        return documentRepository.findVisibleById(id)
                .orElseThrow(() -> new IllegalArgumentException("Document not found: " + id));
    }

    private DocumentUserInteraction getOrCreateInteraction(Long userId, Document document) {
        DocumentUserInteractionId interactionId =
                new DocumentUserInteractionId(userId, document.getDocumentId());
        return documentUserInteractionRepository.findById(interactionId)
                .orElseGet(() -> DocumentUserInteraction.builder()
                        .id(interactionId)
                        .document(document)
                        .favorite(false)
                        .openCount(0)
                        .build());
    }

    private Set<Integer> findFavoriteIds(Long userId, List<Document> documents) {
        if (documents.isEmpty()) {
            return Set.of();
        }
        List<Integer> ids = documents.stream().map(Document::getDocumentId).toList();
        return new HashSet<>(documentUserInteractionRepository.findFavoriteDocumentIds(userId, ids));
    }

    private Pageable createPageable(int page, int size, String sort) {
        String sortBy = "createdAt";
        Sort.Direction direction = Sort.Direction.DESC;

        if (sort != null) {
            if (sort.equalsIgnoreCase("NEWEST")) {
                sortBy = "createdAt";
            } else if (sort.equalsIgnoreCase("MOST_VIEWED")) {
                sortBy = "viewCount";
            } else if (sort.equalsIgnoreCase("RECOMMENDED")) {
                sortBy = "isPinned";
            } else {
                String[] sortParts = sort.split(",");
                Set<String> allowedSortFields = Set.of("createdAt", "updatedAt", "viewCount", "isPinned", "title");
                sortBy = allowedSortFields.contains(sortParts[0]) ? sortParts[0] : "createdAt";
                direction = sortParts.length > 1 && sortParts[1].equalsIgnoreCase("asc")
                        ? Sort.Direction.ASC
                        : Sort.Direction.DESC;
            }
        }

        return PageRequest.of(page, size, Sort.by(direction, sortBy));
    }
}
