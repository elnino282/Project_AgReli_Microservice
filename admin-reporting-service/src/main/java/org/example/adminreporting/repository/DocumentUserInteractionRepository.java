package org.example.adminreporting.repository;

import java.util.List;
import org.example.adminreporting.entity.Document;
import org.example.adminreporting.entity.DocumentUserInteraction;
import org.example.adminreporting.entity.DocumentUserInteractionId;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface DocumentUserInteractionRepository
        extends JpaRepository<DocumentUserInteraction, DocumentUserInteractionId> {

    @Query(value = """
            SELECT i.document FROM DocumentUserInteraction i
            WHERE i.id.userId = :userId
              AND i.favorite = true
              AND i.document.isActive = true
              AND i.document.isPublic = true
              AND (:q IS NULL OR :q = '' OR LENGTH(:q) < 2
                   OR LOWER(i.document.title) LIKE LOWER(CONCAT('%', :q, '%'))
                   OR LOWER(i.document.description) LIKE LOWER(CONCAT('%', :q, '%')))
              AND (:type IS NULL OR :type = '' OR i.document.documentType = :type)
              AND (:crop IS NULL OR :crop = '' OR i.document.crop = :crop)
              AND (:stage IS NULL OR :stage = '' OR i.document.stage = :stage)
              AND (:topic IS NULL OR :topic = '' OR i.document.topic = :topic)
            ORDER BY i.favoritedAt DESC
            """,
            countQuery = """
            SELECT COUNT(i) FROM DocumentUserInteraction i
            WHERE i.id.userId = :userId
              AND i.favorite = true
              AND i.document.isActive = true
              AND i.document.isPublic = true
              AND (:q IS NULL OR :q = '' OR LENGTH(:q) < 2
                   OR LOWER(i.document.title) LIKE LOWER(CONCAT('%', :q, '%'))
                   OR LOWER(i.document.description) LIKE LOWER(CONCAT('%', :q, '%')))
              AND (:type IS NULL OR :type = '' OR i.document.documentType = :type)
              AND (:crop IS NULL OR :crop = '' OR i.document.crop = :crop)
              AND (:stage IS NULL OR :stage = '' OR i.document.stage = :stage)
              AND (:topic IS NULL OR :topic = '' OR i.document.topic = :topic)
            """)
    Page<Document> findFavoriteDocuments(
            @Param("userId") Long userId,
            @Param("q") String q,
            @Param("type") String type,
            @Param("crop") String crop,
            @Param("stage") String stage,
            @Param("topic") String topic,
            Pageable pageable);

    @Query(value = """
            SELECT i.document FROM DocumentUserInteraction i
            WHERE i.id.userId = :userId
              AND i.lastOpenedAt IS NOT NULL
              AND i.document.isActive = true
              AND i.document.isPublic = true
              AND (:q IS NULL OR :q = '' OR LENGTH(:q) < 2
                   OR LOWER(i.document.title) LIKE LOWER(CONCAT('%', :q, '%'))
                   OR LOWER(i.document.description) LIKE LOWER(CONCAT('%', :q, '%')))
              AND (:type IS NULL OR :type = '' OR i.document.documentType = :type)
              AND (:crop IS NULL OR :crop = '' OR i.document.crop = :crop)
              AND (:stage IS NULL OR :stage = '' OR i.document.stage = :stage)
              AND (:topic IS NULL OR :topic = '' OR i.document.topic = :topic)
            ORDER BY i.lastOpenedAt DESC
            """,
            countQuery = """
            SELECT COUNT(i) FROM DocumentUserInteraction i
            WHERE i.id.userId = :userId
              AND i.lastOpenedAt IS NOT NULL
              AND i.document.isActive = true
              AND i.document.isPublic = true
              AND (:q IS NULL OR :q = '' OR LENGTH(:q) < 2
                   OR LOWER(i.document.title) LIKE LOWER(CONCAT('%', :q, '%'))
                   OR LOWER(i.document.description) LIKE LOWER(CONCAT('%', :q, '%')))
              AND (:type IS NULL OR :type = '' OR i.document.documentType = :type)
              AND (:crop IS NULL OR :crop = '' OR i.document.crop = :crop)
              AND (:stage IS NULL OR :stage = '' OR i.document.stage = :stage)
              AND (:topic IS NULL OR :topic = '' OR i.document.topic = :topic)
            """)
    Page<Document> findRecentDocuments(
            @Param("userId") Long userId,
            @Param("q") String q,
            @Param("type") String type,
            @Param("crop") String crop,
            @Param("stage") String stage,
            @Param("topic") String topic,
            Pageable pageable);

    @Query("""
            SELECT i.id.documentId FROM DocumentUserInteraction i
            WHERE i.id.userId = :userId
              AND i.favorite = true
              AND i.id.documentId IN :documentIds
            """)
    List<Integer> findFavoriteDocumentIds(
            @Param("userId") Long userId,
            @Param("documentIds") List<Integer> documentIds);
}
