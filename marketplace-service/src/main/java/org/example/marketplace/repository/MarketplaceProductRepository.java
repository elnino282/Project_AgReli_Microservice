package org.example.marketplace.repository;

import java.math.BigDecimal;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.example.marketplace.entity.MarketplaceProduct;
import org.example.marketplace.model.MarketplaceProductStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface MarketplaceProductRepository extends JpaRepository<MarketplaceProduct, Long>, JpaSpecificationExecutor<MarketplaceProduct> {

    Optional<MarketplaceProduct> findBySlug(String slug);

    Optional<MarketplaceProduct> findBySlugAndStatusIn(String slug, Collection<MarketplaceProductStatus> statuses);

    Optional<MarketplaceProduct> findByIdAndStatusIn(Long id, Collection<MarketplaceProductStatus> statuses);

    Optional<MarketplaceProduct> findByIdAndFarmerUserId(Long id, Long farmerUserId);

    Page<MarketplaceProduct> findByStatusIn(Collection<MarketplaceProductStatus> statuses, Pageable pageable);

    @Query(value = """
            SELECT p FROM MarketplaceProduct p
            WHERE p.status IN (org.example.marketplace.model.MarketplaceProductStatus.PUBLISHED, org.example.marketplace.model.MarketplaceProductStatus.ACTIVE)
              AND p.stockQuantity > 0
              AND (:category IS NULL OR LOWER(p.category) = LOWER(:category))
              AND (:traceable IS NULL OR p.traceable = :traceable)
              AND (:region IS NULL OR LOWER(COALESCE(p.farmRegion, '')) LIKE LOWER(CONCAT('%', :region, '%')))
              AND (:minPrice IS NULL OR p.price >= :minPrice)
              AND (:maxPrice IS NULL OR p.price <= :maxPrice)
              AND (:farmId IS NULL OR p.farmId = :farmId)
              AND (:q IS NULL
                   OR LOWER(p.name) LIKE LOWER(CONCAT('%', :q, '%'))
                   OR LOWER(COALESCE(p.shortDescription, '')) LIKE LOWER(CONCAT('%', :q, '%'))
                   OR LOWER(COALESCE(p.farmName, '')) LIKE LOWER(CONCAT('%', :q, '%')))
            """, countQuery = """
            SELECT COUNT(p) FROM MarketplaceProduct p
            WHERE p.status IN (org.example.marketplace.model.MarketplaceProductStatus.PUBLISHED, org.example.marketplace.model.MarketplaceProductStatus.ACTIVE)
              AND p.stockQuantity > 0
              AND (:category IS NULL OR LOWER(p.category) = LOWER(:category))
              AND (:traceable IS NULL OR p.traceable = :traceable)
              AND (:region IS NULL OR LOWER(COALESCE(p.farmRegion, '')) LIKE LOWER(CONCAT('%', :region, '%')))
              AND (:minPrice IS NULL OR p.price >= :minPrice)
              AND (:maxPrice IS NULL OR p.price <= :maxPrice)
              AND (:farmId IS NULL OR p.farmId = :farmId)
              AND (:q IS NULL
                   OR LOWER(p.name) LIKE LOWER(CONCAT('%', :q, '%'))
                   OR LOWER(COALESCE(p.shortDescription, '')) LIKE LOWER(CONCAT('%', :q, '%'))
                   OR LOWER(COALESCE(p.farmName, '')) LIKE LOWER(CONCAT('%', :q, '%')))
            """)
    Page<MarketplaceProduct> findPublishedProducts(
            @Param("category") String category,
            @Param("q") String q,
            @Param("region") String region,
            @Param("traceable") Boolean traceable,
            @Param("minPrice") BigDecimal minPrice,
            @Param("maxPrice") BigDecimal maxPrice,
            @Param("farmId") Integer farmId,
            Pageable pageable);

    Page<MarketplaceProduct> findByFarmerUserId(Long farmerUserId, Pageable pageable);

    Page<MarketplaceProduct> findByFarmId(Integer farmId, Pageable pageable);

    List<MarketplaceProduct> findByLotId(Integer lotId);

    List<MarketplaceProduct> findByLotIdIn(Collection<Integer> lotIds);

    boolean existsByLotId(Integer lotId);

    boolean existsByLotIdAndIdNot(Integer lotId, Long id);

    long countByFarmerUserId(Long farmerUserId);

    long countByFarmerUserIdAndStatus(Long farmerUserId, MarketplaceProductStatus status);

    long countByStatus(MarketplaceProductStatus status);

    long countByStatusIn(Collection<MarketplaceProductStatus> statuses);

    @Query(value = """
            SELECT DISTINCT p.farmId AS farmId, p.farmName AS farmName
            FROM MarketplaceProduct p
            WHERE p.status IN (org.example.marketplace.model.MarketplaceProductStatus.PUBLISHED, org.example.marketplace.model.MarketplaceProductStatus.ACTIVE)
              AND p.stockQuantity > 0
              AND (:q IS NULL OR LOWER(p.farmName) LIKE LOWER(CONCAT('%', :q, '%')))
              AND (:region IS NULL OR LOWER(COALESCE(p.farmRegion, '')) LIKE LOWER(CONCAT('%', :region, '%')))
            ORDER BY p.farmName ASC, p.farmId ASC
            """, countQuery = """
            SELECT COUNT(DISTINCT p.farmId) FROM MarketplaceProduct p
            WHERE p.status IN (org.example.marketplace.model.MarketplaceProductStatus.PUBLISHED, org.example.marketplace.model.MarketplaceProductStatus.ACTIVE)
              AND p.stockQuantity > 0
              AND (:q IS NULL OR LOWER(p.farmName) LIKE LOWER(CONCAT('%', :q, '%')))
              AND (:region IS NULL OR LOWER(COALESCE(p.farmRegion, '')) LIKE LOWER(CONCAT('%', :region, '%')))
            """)
    Page<FarmProjection> searchDistinctFarmsWithPublishedProducts(
            @Param("q") String q,
            @Param("region") String region,
            Pageable pageable);

    @Query("""
            SELECT p.farmId AS farmId, COUNT(p.id) AS productCount
            FROM MarketplaceProduct p
            WHERE p.farmId IN :farmIds
              AND p.status IN (org.example.marketplace.model.MarketplaceProductStatus.PUBLISHED, org.example.marketplace.model.MarketplaceProductStatus.ACTIVE)
              AND p.stockQuantity > 0
            GROUP BY p.farmId
            """)
    List<FarmProductCountProjection> countPublishedByFarmIds(
            @Param("farmIds") Collection<Integer> farmIds);

    @Query("""
            SELECT DISTINCT p.farmId
            FROM MarketplaceProduct p
            WHERE p.farmId IN :farmIds
              AND p.status IN (org.example.marketplace.model.MarketplaceProductStatus.PUBLISHED, org.example.marketplace.model.MarketplaceProductStatus.ACTIVE)
              AND p.traceable = true
              AND p.stockQuantity > 0
            """)
    List<Integer> findFarmIdsWithTraceableProducts(
            @Param("farmIds") Collection<Integer> farmIds);

    @Query("""
            SELECT COUNT(p)
            FROM MarketplaceProduct p
            WHERE p.farmId = :farmId
              AND p.status IN (org.example.marketplace.model.MarketplaceProductStatus.PUBLISHED, org.example.marketplace.model.MarketplaceProductStatus.ACTIVE)
              AND p.stockQuantity > 0
            """)
    long countSellableByFarmId(@Param("farmId") Integer farmId);

    @Query("""
            SELECT COUNT(p) > 0
            FROM MarketplaceProduct p
            WHERE p.farmId = :farmId
              AND p.status IN (org.example.marketplace.model.MarketplaceProductStatus.PUBLISHED, org.example.marketplace.model.MarketplaceProductStatus.ACTIVE)
              AND p.traceable = true
              AND p.stockQuantity > 0
            """)
    boolean existsSellableTraceableByFarmId(@Param("farmId") Integer farmId);

    interface FarmProductCountProjection {
        Integer getFarmId();
        Long getProductCount();
    }

    interface FarmProjection {
        Integer getFarmId();
        String getFarmName();
    }
}
