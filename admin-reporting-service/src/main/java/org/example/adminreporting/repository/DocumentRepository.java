package org.example.adminreporting.repository;

import java.util.List;
import java.util.Optional;
import org.example.adminreporting.entity.Document;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface DocumentRepository extends JpaRepository<Document, Integer> {

    List<Document> findByTitleContainingIgnoreCase(String title);

    @Query("SELECT d FROM Document d WHERE d.isActive = true AND d.isPublic = true " +
            "AND (:q IS NULL OR :q = '' OR LENGTH(:q) < 2 OR LOWER(d.title) LIKE LOWER(CONCAT('%', :q, '%')) OR LOWER(d.description) LIKE LOWER(CONCAT('%', :q, '%'))) " +
            "AND (:type IS NULL OR :type = '' OR d.documentType = :type) " +
            "AND (:crop IS NULL OR :crop = '' OR d.crop = :crop) " +
            "AND (:stage IS NULL OR :stage = '' OR d.stage = :stage) " +
            "AND (:topic IS NULL OR :topic = '' OR d.topic = :topic)")
    Page<Document> findAllVisible(
            @Param("q") String q,
            @Param("type") String type,
            @Param("crop") String crop,
            @Param("stage") String stage,
            @Param("topic") String topic,
            Pageable pageable);

    @Query("SELECT d FROM Document d WHERE d.documentId = :id AND d.isActive = true AND d.isPublic = true")
    Optional<Document> findVisibleById(@Param("id") Integer id);

    @Query("SELECT d FROM Document d WHERE d.documentId IN :ids AND d.isActive = true AND d.isPublic = true")
    List<Document> findVisibleByIds(@Param("ids") List<Integer> ids);

    @Modifying
    @Query("UPDATE Document d SET d.viewCount = COALESCE(d.viewCount, 0) + 1 WHERE d.documentId = :id")
    void incrementViewCount(@Param("id") Integer id);
}
