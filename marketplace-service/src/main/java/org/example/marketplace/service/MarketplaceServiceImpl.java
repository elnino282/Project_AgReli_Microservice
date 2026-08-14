package org.example.marketplace.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.example.marketplace.exception.ResourceNotFoundException;
import org.example.marketplace.exception.BadRequestException;
import org.example.marketplace.exception.ForbiddenException;
import org.example.marketplace.exception.ConflictException;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.example.marketplace.client.FarmClient;
import org.example.marketplace.client.IdentityClient;
import org.example.marketplace.client.InventoryClient;
import org.example.marketplace.client.SeasonClient;
import org.example.marketplace.client.DeliveryShippingQuoteClient;
import org.example.marketplace.dto.client.FarmDetailDto;
import org.example.marketplace.dto.client.FarmSummaryDto;
import org.example.marketplace.dto.client.SeasonDetailDto;
import org.example.marketplace.dto.request.MarketplaceAddCartItemRequest;
import org.example.marketplace.dto.request.MarketplaceAddressUpsertRequest;
import org.example.marketplace.dto.request.MarketplaceCreateOrderRequest;
import org.example.marketplace.dto.request.MarketplaceCreateReviewRequest;
import org.example.marketplace.dto.request.MarketplaceFarmerProductUpsertRequest;
import org.example.marketplace.dto.request.MarketplaceMergeCartRequest;
import org.example.marketplace.dto.request.MarketplaceRejectPaymentProofRequest;
import org.example.marketplace.dto.request.MarketplaceUpdateCartItemRequest;
import org.example.marketplace.dto.request.MarketplaceUpdateOrderStatusRequest;
import org.example.marketplace.dto.request.MarketplaceUpdatePaymentVerificationRequest;
import org.example.marketplace.dto.request.MarketplaceUpdateProductStatusRequest;
import org.example.marketplace.dto.request.MarketplaceUpdateReviewRequest;
import org.example.marketplace.dto.request.MarketplaceShippingQuoteRequest;
import org.example.marketplace.dto.response.MarketplaceAdminStatsResponse;
import org.example.marketplace.dto.response.MarketplaceAddressResponse;
import org.example.marketplace.dto.response.MarketplaceCartResponse;
import org.example.marketplace.dto.response.MarketplaceCreateOrderResultResponse;
import org.example.marketplace.dto.response.MarketplaceFarmerDashboardResponse;
import org.example.marketplace.dto.response.MarketplaceFarmerProductFormFarmOptionResponse;
import org.example.marketplace.dto.response.MarketplaceFarmerProductFormLotOptionResponse;
import org.example.marketplace.dto.response.MarketplaceFarmerProductFormOptionsResponse;
import org.example.marketplace.dto.response.MarketplaceFarmerProductFormSeasonOptionResponse;
import org.example.marketplace.dto.response.MarketplaceFarmDetailResponse;
import org.example.marketplace.dto.response.MarketplaceFarmSummaryResponse;
import org.example.marketplace.dto.response.MarketplaceOrderAuditLogResponse;
import org.example.marketplace.dto.response.MarketplaceOrderItemResponse;
import org.example.marketplace.dto.response.MarketplaceOrderPaymentResponse;
import org.example.marketplace.dto.response.MarketplaceOrderPreviewResponse;
import org.example.marketplace.dto.response.MarketplaceOrderResponse;
import org.example.marketplace.dto.response.MarketplacePaymentProofResponse;
import org.example.marketplace.dto.response.MarketplaceProductDetailResponse;
import org.example.marketplace.dto.response.MarketplaceProductSummaryResponse;
import org.example.marketplace.dto.response.MarketplaceReviewResponse;
import org.example.marketplace.dto.response.MarketplaceTraceabilityResponse;
import org.example.marketplace.dto.response.MarketplaceShippingQuoteGroupResponse;
import org.example.marketplace.dto.client.FarmCertificationDto;
import org.example.marketplace.dto.client.PesticideRecordDto;
import org.example.marketplace.dto.response.MarketplaceTraceabilityResponse.CertificationInfo;
import org.example.marketplace.dto.response.MarketplaceTraceabilityResponse.PHISafetyInfo;
import org.example.marketplace.dto.response.MarketplaceTraceabilityResponse.PHISafetyInfo.PesticideUsageItem;
import java.time.LocalDate;
import org.example.marketplace.util.QRCodeGenerator;
import org.example.marketplace.entity.MarketplaceAddress;
import org.example.marketplace.entity.MarketplaceCart;
import org.example.marketplace.entity.MarketplaceCartItem;
import org.example.marketplace.entity.MarketplaceOrder;
import org.example.marketplace.entity.MarketplaceOrderAuditLog;
import org.example.marketplace.entity.MarketplaceOrderGroup;
import org.example.marketplace.entity.MarketplaceOrderItem;
import org.example.marketplace.entity.MarketplaceProduct;
import org.example.marketplace.entity.MarketplaceProductReview;
import org.example.marketplace.event.DomainEventPublisher;
import org.example.marketplace.event.MarketplaceOrderCancelledEvent;
import org.example.marketplace.event.MarketplaceOrderCompletedEvent;
import org.example.marketplace.event.MarketplaceOrderCreatedEvent;
import org.example.marketplace.event.MarketplacePaymentSubmittedEvent;
import org.example.marketplace.event.MarketplacePaymentVerifiedEvent;
import org.example.marketplace.event.MarketplaceProductChangedEvent;
import org.example.marketplace.model.MarketplaceOrderStatus;
import org.example.marketplace.model.MarketplacePaymentMethod;
import org.example.marketplace.model.MarketplacePaymentVerificationStatus;
import org.example.marketplace.model.MarketplaceProductStatus;
import org.example.marketplace.repository.MarketplaceAddressRepository;
import java.util.Comparator;
import org.example.marketplace.repository.MarketplaceCartItemRepository;
import org.example.marketplace.repository.MarketplaceCartRepository;
import org.example.marketplace.repository.MarketplaceOrderGroupRepository;
import org.example.marketplace.repository.MarketplaceOrderItemRepository;
import org.example.marketplace.repository.MarketplaceOrderRepository;
import org.example.marketplace.repository.MarketplaceProductRepository;
import org.example.marketplace.repository.MarketplaceProductReviewRepository;
import org.example.marketplace.repository.MarketplaceOrderAuditLogRepository;
import org.example.marketplace.shared.security.CurrentUserService;
import org.example.DTO.Common.PageResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@Slf4j
public class MarketplaceServiceImpl implements MarketplaceService {

    static final String CURRENCY_VND = "VND";
    static final BigDecimal LOW_STOCK_THRESHOLD = new BigDecimal("10");
    static final BigDecimal ZERO_QUANTITY = BigDecimal.ZERO;
    static final List<MarketplaceProductStatus> PUBLIC_PRODUCT_STATUSES = List.of(
            MarketplaceProductStatus.ACTIVE,
            MarketplaceProductStatus.PUBLISHED);

    MarketplaceProductRepository marketplaceProductRepository;
    MarketplaceCartRepository marketplaceCartRepository;
    MarketplaceCartItemRepository marketplaceCartItemRepository;
    MarketplaceOrderGroupRepository marketplaceOrderGroupRepository;
    MarketplaceOrderItemRepository marketplaceOrderItemRepository;
    MarketplaceOrderRepository marketplaceOrderRepository;
    MarketplaceAddressRepository marketplaceAddressRepository;
    MarketplaceProductReviewRepository marketplaceProductReviewRepository;
    MarketplaceOrderAuditLogRepository marketplaceOrderAuditLogRepository;
    FarmClient farmClient;
    SeasonClient seasonClient;
    InventoryClient inventoryClient;
    IdentityClient identityClient;
    CurrentUserService currentUserService;
    ObjectMapper objectMapper;
    IdempotencyService idempotencyService;
    MarketplaceStorageService storageService;
    QRCodeGenerator qrCodeGenerator;
    DomainEventPublisher domainEventPublisher;
    MarketplaceComplianceGateService complianceGateService;
    MarketplaceShippingQuoteService marketplaceShippingQuoteService;
    MarketplaceCheckoutItemResolver checkoutItemResolver;

    private record OrderShippingGroup(Long sellerUserId, Integer farmId) {
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponse<MarketplaceProductSummaryResponse> listProducts(
            String category, String q, String region, Boolean traceable,
            BigDecimal minPrice, BigDecimal maxPrice, String sort,
            Integer farmId, int page, int size) {
        Pageable pageable = PageRequest.of(Math.max(0, page), Math.max(1, size));
        Page<MarketplaceProduct> productPage = marketplaceProductRepository.findPublishedProducts(
                category, q, region, traceable, minPrice, maxPrice, farmId, pageable);

        List<MarketplaceProductSummaryResponse> items = productPage.getContent().stream()
                .map(this::toProductSummary)
                .toList();

        return PageResponse.of(productPage, items);
    }

    @Override
    @Transactional(readOnly = true)
    public MarketplaceProductDetailResponse getProductBySlug(String slug) {
        MarketplaceProduct product = marketplaceProductRepository.findBySlugAndStatusIn(slug, PUBLIC_PRODUCT_STATUSES)
                .orElseThrow(() -> new ResourceNotFoundException("Product not found"));
        return toProductDetail(product);
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponse<MarketplaceReviewResponse> listProductReviews(Long productId, int page, int size) {
        Pageable pageable = PageRequest.of(Math.max(0, page), Math.max(1, size));
        Page<MarketplaceProductReview> reviewPage = marketplaceProductReviewRepository.findByProductId(productId, pageable);
        List<MarketplaceReviewResponse> items = reviewPage.getContent().stream()
                .map(this::toReviewResponse)
                .toList();
        return PageResponse.of(reviewPage, items);
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponse<MarketplaceFarmSummaryResponse> listFarms(String q, String region, int page, int size) {
        Pageable pageable = PageRequest.of(Math.max(0, page), Math.max(1, size));
        
        Page<MarketplaceProductRepository.FarmProjection> farmProjectionsPage =
                marketplaceProductRepository.searchDistinctFarmsWithPublishedProducts(
                        q != null ? q.trim() : null,
                        region != null ? region.trim() : null,
                        pageable);

        if (farmProjectionsPage.isEmpty()) {
            return new PageResponse<>(List.of(), page, size, 0, 0, false, false);
        }

        List<Integer> farmIds = farmProjectionsPage.getContent().stream()
                .map(MarketplaceProductRepository.FarmProjection::getFarmId)
                .filter(Objects::nonNull)
                .toList();

        List<FarmSummaryDto> farmDtos = farmClient.getFarmsByIds(farmIds);
        Map<Integer, FarmSummaryDto> farmDtoById = farmDtos.stream()
                .filter(Objects::nonNull)
                .collect(java.util.stream.Collectors.toMap(FarmSummaryDto::id, f -> f, (f1, f2) -> f1));

        List<MarketplaceProductRepository.FarmProductCountProjection> countProjections =
                marketplaceProductRepository.countPublishedByFarmIds(farmIds);
        Map<Integer, Long> productCountByFarmId = countProjections.stream()
                .collect(java.util.stream.Collectors.toMap(
                        MarketplaceProductRepository.FarmProductCountProjection::getFarmId,
                        MarketplaceProductRepository.FarmProductCountProjection::getProductCount
                ));

        List<Integer> traceableFarmIds = marketplaceProductRepository.findFarmIdsWithTraceableProducts(farmIds);
        java.util.Set<Integer> traceableFarmIdSet = new java.util.HashSet<>(traceableFarmIds);

        List<MarketplaceFarmSummaryResponse> items = farmProjectionsPage.getContent().stream()
                .map(proj -> {
                    Integer fId = proj.getFarmId();
                    String farmName = proj.getFarmName();
                    
                    FarmSummaryDto dto = farmDtoById.get(fId);
                    String regionStr = null;
                    if (dto != null) {
                        farmName = dto.name() != null ? dto.name() : farmName;
                        regionStr = dto.provinceName() != null ? dto.provinceName() : "";
                        if (dto.wardName() != null && !dto.wardName().isBlank()) {
                            regionStr = regionStr.isEmpty() ? dto.wardName() : regionStr + ", " + dto.wardName();
                        }
                    }

                    long prodCount = productCountByFarmId.getOrDefault(fId, 0L);
                    boolean hasTraceable = traceableFarmIdSet.contains(fId);

                    return new MarketplaceFarmSummaryResponse(
                            fId,
                            farmName,
                            regionStr,
                            null,
                            null,
                            prodCount,
                            true,
                            null,
                            null,
                            hasTraceable
                    );
                })
                .toList();

        return PageResponse.of(farmProjectionsPage, items);
    }

    @Override
    @Transactional(readOnly = true)
    public MarketplaceFarmDetailResponse getFarmDetail(Integer farmId) {
        FarmDetailDto farmDetail = farmClient.getFarmDetail(farmId);
        if (farmDetail == null) {
            throw new ResourceNotFoundException("Farm not found");
        }
        String region = farmDetail.provinceName() != null ? farmDetail.provinceName() : "";
        if (farmDetail.wardName() != null) {
            region += ", " + farmDetail.wardName();
        }
        
        long productCount = marketplaceProductRepository.countSellableByFarmId(farmId);
        boolean hasTraceable = marketplaceProductRepository.existsSellableTraceableByFarmId(farmId);
        String ownerDisplayName = null;
        if (farmDetail.userId() != null) {
            ownerDisplayName = identityClient.getUserDisplayName(farmDetail.userId());
        }

        return new MarketplaceFarmDetailResponse(
                farmDetail.id(),
                farmDetail.name(),
                region,
                null,
                null,
                productCount,
                true,
                farmDetail.averageRating(),
                0,
                hasTraceable,
                null,
                farmDetail.userId(),
                ownerDisplayName,
                null);
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponse<MarketplaceReviewResponse> listFarmReviews(Integer farmId, int page, int size) {
        Pageable pageable = PageRequest.of(Math.max(0, page), Math.max(1, size));
        Page<MarketplaceProductReview> reviewPage = marketplaceProductReviewRepository.findByFarmId(farmId, pageable);
        List<MarketplaceReviewResponse> items = reviewPage.getContent().stream()
                .map(this::toReviewResponse)
                .toList();
        return PageResponse.of(reviewPage, items);
    }

    @Override
    @Transactional(readOnly = true)
    public MarketplaceTraceabilityResponse getTraceability(Long productId) {
        MarketplaceProduct product = marketplaceProductRepository.findByIdAndStatusIn(productId, PUBLIC_PRODUCT_STATUSES)
                .orElseThrow(() -> new ResourceNotFoundException("Product not found"));

        return buildTraceabilityResponse(product, null);
    }

    @Override
    @Transactional(readOnly = true)
    public MarketplaceTraceabilityResponse getPublicTraceability(String productIdOrSlug) {
        MarketplaceProduct product = null;
        try {
            Long productId = Long.parseLong(productIdOrSlug);
            product = marketplaceProductRepository.findByIdAndStatusIn(productId, PUBLIC_PRODUCT_STATUSES).orElse(null);
        } catch (NumberFormatException e) {
            // Not a number, try by slug
        }

        if (product == null) {
            product = marketplaceProductRepository.findBySlugAndStatusIn(productIdOrSlug, PUBLIC_PRODUCT_STATUSES)
                    .orElseThrow(() -> new ResourceNotFoundException("Product not found with id or slug: " + productIdOrSlug));
        }

        MarketplaceTraceabilityResponse base = buildTraceabilityResponse(product, null);

        CertificationInfo certInfo = null;
        if (product.getCertificationSnapshotJson() != null && !product.getCertificationSnapshotJson().isBlank()) {
            try {
                certInfo = objectMapper.readValue(product.getCertificationSnapshotJson(), CertificationInfo.class);
            } catch (Exception e) {
                log.warn("Failed to deserialize certification snapshot for productId={}: {}", product.getId(), e.getMessage());
            }
        }

        PHISafetyInfo phiInfo = null;
        if (product.getHarvestSafetySnapshotJson() != null && !product.getHarvestSafetySnapshotJson().isBlank()) {
            try {
                phiInfo = objectMapper.readValue(product.getHarvestSafetySnapshotJson(), PHISafetyInfo.class);
                // Filter out non-SAFE items for public view per BRD BR-H-02
                if (phiInfo != null && phiInfo.usage() != null) {
                    List<PesticideUsageItem> safeUsage = phiInfo.usage().stream()
                            .filter(u -> "SAFE".equals(u.status()))
                            .toList();
                    phiInfo = new PHISafetyInfo(
                            phiInfo.isSafe(),
                            phiInfo.totalPesticidesUsed(),
                            phiInfo.safePesticides(),
                            phiInfo.cautionPesticides(),
                            safeUsage
                    );
                }
            } catch (Exception e) {
                log.warn("Failed to deserialize harvest safety snapshot for productId={}: {}", product.getId(), e.getMessage());
            }
        }

        MarketplaceTraceabilityResponse.SeasonTraceability season = base.season();
        if (product.getSeasonId() != null && season != null) {
            try {
                SeasonDetailDto seasonDto = seasonClient.getSeasonDetail(product.getSeasonId());
                if (seasonDto != null) {
                    season = new MarketplaceTraceabilityResponse.SeasonTraceability(
                            season.id(),
                            season.name(),
                            season.cropName(),
                            seasonDto.varietyName() != null ? seasonDto.varietyName() : season.varietyName(),
                            seasonDto.startDate(),
                            season.harvestDate()
                    );
                }
            } catch (Exception e) {
                log.warn("Failed to fetch season details for seasonId={}: {}", product.getSeasonId(), e.getMessage());
            }
        }

        return new MarketplaceTraceabilityResponse(
                base.productId(),
                base.traceable(),
                base.farm(),
                base.plot(),
                season,
                base.harvest(),
                base.productLot(),
                base.timeline(),
                base.validatedAt(),
                certInfo,
                phiInfo,
                null // nutritionClaim (phase sau)
        );
    }

    @Override
    @Transactional(readOnly = true)
    public byte[] getProductQRCode(Long productId, int width) {
        MarketplaceProduct product = marketplaceProductRepository.findById(productId)
                .orElseThrow(() -> new ResourceNotFoundException("Product not found"));
        String url = qrCodeGenerator.generateTraceUrl(product.getId(), product.getSlug());
        return qrCodeGenerator.generateQRImage(url, width);
    }

    @Override
    @Transactional(readOnly = true)
    public MarketplaceTraceabilityResponse getOrderItemTraceability(Long orderId, Long itemId) {
        Long userId = currentUserService.getCurrentUserId();

        // Verify access to the order
        MarketplaceOrder order = marketplaceOrderRepository.findByIdAndBuyerUserId(orderId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found"));

        // Get the order item
        MarketplaceOrderItem item = marketplaceOrderItemRepository.findByIdAndOrderId(itemId, orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Order item not found"));

        return buildTraceabilityResponse(null, item);
    }

    @Override
    @Transactional
    public MarketplaceReviewResponse createReview(Long orderId, MarketplaceCreateReviewRequest request) {
        Long buyerUserId = currentUserService.getCurrentUserId();

        // Get the order item
        MarketplaceOrderItem item = marketplaceOrderItemRepository.findById(request.orderItemId())
                .orElseThrow(() -> new ResourceNotFoundException("Order item not found"));

        // Verify buyer owns this order
        if (!item.getOrder().getBuyerUserId().equals(buyerUserId)) {
            throw new BadRequestException("Forbidden: you can only review your own orders");
        }

        // Verify order is completed
        if (item.getOrder().getStatus() != MarketplaceOrderStatus.COMPLETED) {
            throw new BadRequestException("Can only review completed orders");
        }

        // Check if review already exists
        marketplaceProductReviewRepository.findByOrderItemIdAndBuyerUserId(request.orderItemId(), buyerUserId)
                .ifPresent(existing -> {
                    throw new ConflictException("You have already reviewed this item");
                });

        String buyerDisplayName = identityClient.getUserDisplayName(buyerUserId);
        if (buyerDisplayName == null || buyerDisplayName.isBlank()) {
            buyerDisplayName = "Buyer";
        }

        // Create review
        MarketplaceProductReview review = MarketplaceProductReview.builder()
                .productId(item.getProductId())
                .orderId(item.getOrder().getId())
                .orderItemId(request.orderItemId())
                .buyerUserId(buyerUserId)
                .buyerDisplayName(buyerDisplayName)
                .rating(request.rating())
                .comment(request.comment())
                .hidden(false)
                .build();

        review = marketplaceProductReviewRepository.save(review);
        return toReviewResponse(review);
    }

    @Override
    public MarketplaceReviewResponse createReviewLegacy(MarketplaceCreateReviewRequest request) {
        return createReview(null, request);
    }

    @Override
    @Transactional
    public MarketplaceReviewResponse editReview(Long reviewId, MarketplaceUpdateReviewRequest request) {
        MarketplaceProductReview review = marketplaceProductReviewRepository.findById(reviewId)
                .orElseThrow(() -> new ResourceNotFoundException("Review not found"));

        Long userId = currentUserService.getCurrentUserId();
        if (!Objects.equals(review.getBuyerUserId(), userId)) {
            throw new ForbiddenException("Forbidden");
        }

        if (request.rating() != null) {
            review.setRating(request.rating());
        }
        if (request.comment() != null) {
            review.setComment(request.comment());
        }

        review = marketplaceProductReviewRepository.save(review);
        return toReviewResponse(review);
    }

    @Override
    @Transactional
    public void deleteReview(Long reviewId) {
        MarketplaceProductReview review = marketplaceProductReviewRepository.findById(reviewId)
                .orElseThrow(() -> new ResourceNotFoundException("Review not found"));

        Long userId = currentUserService.getCurrentUserId();
        if (!Objects.equals(review.getBuyerUserId(), userId)) {
            throw new ForbiddenException("Forbidden");
        }

        marketplaceProductReviewRepository.delete(review);
    }

    @Override
    @Transactional
    public MarketplaceReviewResponse adminHideReview(Long reviewId) {
        MarketplaceProductReview review = marketplaceProductReviewRepository.findById(reviewId)
                .orElseThrow(() -> new ResourceNotFoundException("Review not found"));
        review.setHidden(true);
        review = marketplaceProductReviewRepository.save(review);
        return toReviewResponse(review);
    }

    @Override
    @Transactional
    public void adminDeleteReview(Long reviewId) {
        marketplaceProductReviewRepository.deleteById(reviewId);
    }

    @Override
    @Transactional(readOnly = true)
    public MarketplaceCartResponse getCart() {
        Long userId = currentUserService.getCurrentUserId();
        Optional<MarketplaceCart> cartOpt = marketplaceCartRepository.findByUserId(userId);
        if (cartOpt.isEmpty()) {
            return emptyCart(userId);
        }
        return buildCartResponse(userId, cartOpt.get());
    }

    @Override
    @Transactional
    public MarketplaceCartResponse addCartItem(MarketplaceAddCartItemRequest request) {
        Long userId = currentUserService.getCurrentUserId();
        MarketplaceCart cart = getOrCreateCart(userId);

        MarketplaceProduct product = marketplaceProductRepository.findById(request.productId())
                .orElseThrow(() -> new ResourceNotFoundException("Product not found"));

        Optional<MarketplaceCartItem> existingItem = marketplaceCartItemRepository
                .findByCartIdAndProductId(cart.getId(), product.getId());

        if (existingItem.isPresent()) {
            MarketplaceCartItem item = existingItem.get();
            item.setQuantity(item.getQuantity().add(request.quantity()));
            marketplaceCartItemRepository.save(item);
        } else {
            MarketplaceCartItem item = MarketplaceCartItem.builder()
                    .cart(cart)
                    .product(product)
                    .quantity(request.quantity())
                    .unitPriceSnapshot(product.getPrice())
                    .build();
            marketplaceCartItemRepository.save(item);
        }

        return buildCartResponse(userId, cart);
    }

    @Override
    @Transactional
    public MarketplaceCartResponse updateCartItem(Long productId, MarketplaceUpdateCartItemRequest request) {
        Long userId = currentUserService.getCurrentUserId();
        MarketplaceCart cart = marketplaceCartRepository.findByUserId(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Cart not found"));

        MarketplaceCartItem item = marketplaceCartItemRepository
                .findByCartIdAndProductId(cart.getId(), productId)
                .orElseThrow(() -> new ResourceNotFoundException("Cart item not found"));

        item.setQuantity(request.quantity());
        marketplaceCartItemRepository.save(item);

        return buildCartResponse(userId, cart);
    }

    @Override
    @Transactional
    public MarketplaceCartResponse removeCartItem(Long productId) {
        Long userId = currentUserService.getCurrentUserId();
        MarketplaceCart cart = marketplaceCartRepository.findByUserId(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Cart not found"));

        marketplaceCartItemRepository.deleteByCartIdAndProductId(cart.getId(), productId);

        return buildCartResponse(userId, cart);
    }

    @Override
    @Transactional
    public MarketplaceCartResponse mergeCart(MarketplaceMergeCartRequest request) {
        Long userId = currentUserService.getCurrentUserId();
        MarketplaceCart cart = getOrCreateCart(userId);

        for (MarketplaceMergeCartRequest.MarketplaceMergeCartItem mergeItem : request.items()) {
            MarketplaceProduct product = marketplaceProductRepository.findById(mergeItem.productId())
                    .orElseThrow(() -> new ResourceNotFoundException("Product not found"));

            Optional<MarketplaceCartItem> existingItem = marketplaceCartItemRepository
                    .findByCartIdAndProductId(cart.getId(), product.getId());

            if (existingItem.isPresent()) {
                MarketplaceCartItem item = existingItem.get();
                item.setQuantity(item.getQuantity().add(mergeItem.quantity()));
                marketplaceCartItemRepository.save(item);
            } else {
                MarketplaceCartItem item = MarketplaceCartItem.builder()
                        .cart(cart)
                        .product(product)
                        .quantity(mergeItem.quantity())
                        .unitPriceSnapshot(product.getPrice())
                        .build();
                marketplaceCartItemRepository.save(item);
            }
        }

        return buildCartResponse(userId, cart);
    }

    @Override
    @Transactional
    public MarketplaceCartResponse clearCart() {
        Long userId = currentUserService.getCurrentUserId();
        Optional<MarketplaceCart> cartOpt = marketplaceCartRepository.findByUserId(userId);
        if (cartOpt.isPresent()) {
            marketplaceCartItemRepository.deleteAllByCartId(cartOpt.get().getId());
        }
        return emptyCart(userId);
    }

    @Override
    @Transactional(readOnly = true)
    public MarketplaceOrderPreviewResponse previewOrder(MarketplaceCreateOrderRequest request) {
        Long buyerUserId = currentUserService.getCurrentUserId();

        // Get cart items
        MarketplaceCart cart = marketplaceCartRepository.findByUserIdWithItems(buyerUserId)
                .orElseThrow(() -> new ResourceNotFoundException("Cart not found"));

        List<MarketplaceCartItem> cartItems = cart.getItems();
        if (cartItems.isEmpty()) {
            return new MarketplaceOrderPreviewResponse(
                    List.of(),
                    BigDecimal.ZERO,
                    BigDecimal.ZERO,
                    BigDecimal.ZERO,
                    null, null, null,
                    0,
                    CURRENCY_VND);
        }

        // Get buyer address if addressId provided
        String shippingRecipientName = request.shippingRecipientName();
        String phoneVal = request.shippingPhone();
        String addressLineVal = request.shippingAddressLine();
        if (request.addressId() != null) {
            Optional<MarketplaceAddress> addressOpt = marketplaceAddressRepository.findByIdAndUserId(request.addressId(), buyerUserId);
            if (addressOpt.isPresent()) {
                MarketplaceAddress addr = addressOpt.get();
                shippingRecipientName = addr.getFullName();
                phoneVal = addr.getPhone();
                String addrLine = addr.getStreet() + ", " + addr.getWard() + ", " + addr.getDistrict() + ", " + addr.getProvince();
                if (addr.getDetail() != null && !addr.getDetail().isBlank()) {
                    addrLine = addr.getDetail() + ", " + addrLine;
                }
                addressLineVal = addrLine;
            }
        }
        final String shippingPhone = phoneVal;
        final String shippingAddressLine = addressLineVal;

        // Group items by farmer
        Map<Long, List<MarketplaceCartItem>> itemsByFarmer = cartItems.stream()
                .collect(java.util.stream.Collectors.groupingBy(MarketplaceCartItem::getFarmerUserId));

        // Build seller groups
        List<MarketplaceOrderPreviewResponse.SellerGroup> sellerGroups = new ArrayList<>();
        BigDecimal grandSubtotal = BigDecimal.ZERO;
        int totalSellers = 0;

        for (Map.Entry<Long, List<MarketplaceCartItem>> entry : itemsByFarmer.entrySet()) {
            Long farmerUserId = entry.getKey();
            List<MarketplaceCartItem> farmerItems = entry.getValue();

            // Get farmer display name
            String farmerDisplayName = identityClient.getUserDisplayName(farmerUserId);
            if (farmerDisplayName == null) {
                farmerDisplayName = "Farmer " + farmerUserId;
            }

            // Get farm info from first item
            Integer farmId = farmerItems.get(0).getProduct().getFarmId();
            String farmName = farmerItems.get(0).getProduct().getFarmName();

            BigDecimal subtotal = BigDecimal.ZERO;
            List<MarketplaceOrderPreviewResponse.PreviewItem> previewItems = new ArrayList<>();

            for (MarketplaceCartItem item : farmerItems) {
                MarketplaceProduct product = item.getProduct();
                BigDecimal lineTotal = product.getPrice().multiply(item.getQuantity());
                subtotal = subtotal.add(lineTotal);

                previewItems.add(new MarketplaceOrderPreviewResponse.PreviewItem(
                        product.getId(),
                        product.getSlug(),
                        product.getName(),
                        product.getImageUrl(),
                        product.getPrice(),
                        item.getQuantity(),
                        lineTotal,
                        product.getLotId() != null
                ));
            }

            grandSubtotal = grandSubtotal.add(subtotal);
            totalSellers++;

            // Shipping fee could be calculated based on rules, default to 0 for now
            BigDecimal shippingFee = BigDecimal.ZERO;

            sellerGroups.add(new MarketplaceOrderPreviewResponse.SellerGroup(
                    farmerUserId,
                    farmerDisplayName,
                    farmId,
                    farmName,
                    previewItems,
                    subtotal,
                    shippingFee,
                    subtotal.add(shippingFee)
            ));
        }

        return new MarketplaceOrderPreviewResponse(
                sellerGroups,
                grandSubtotal,
                BigDecimal.ZERO, // grandShippingFee
                grandSubtotal, // grandTotal
                shippingRecipientName,
                shippingPhone,
                shippingAddressLine,
                totalSellers,
                CURRENCY_VND);
    }

    @Override
    public List<MarketplaceShippingQuoteGroupResponse> createShippingQuotes(MarketplaceShippingQuoteRequest request) {
        return marketplaceShippingQuoteService.quoteCart(request);
    }

    @Override
    @Transactional
    public MarketplaceCreateOrderResultResponse createOrder(MarketplaceCreateOrderRequest request, String idempotencyKey) {
        // Validate idempotency key
        if (idempotencyKey == null || idempotencyKey.isBlank()) {
            throw new BadRequestException("X-Idempotency-Key header is required for checkout");
        }

        String endpoint = "/api/v1/marketplace/orders";

        // Check if we've already processed this request
        var existingResponse = idempotencyService.getExistingResponse(
                idempotencyKey, endpoint, MarketplaceCreateOrderResultResponse.class);
        if (existingResponse.isPresent()) {
            log.info("Returning cached response for idempotency key: {}", idempotencyKey);
            return existingResponse.get();
        }

        // Try to acquire lock for this idempotency key
        if (!idempotencyService.tryAcquireLock(idempotencyKey, endpoint)) {
            throw new ConflictException("Order is already being processed. Please wait and try again.");
        }

        try {
            return processCreateOrder(request, idempotencyKey);
        } catch (Exception e) {
            log.error("Failed to create order with idempotency key: {}", idempotencyKey, e);
            throw e;
        }
    }

    private MarketplaceCreateOrderResultResponse processCreateOrder(MarketplaceCreateOrderRequest request, String idempotencyKey) {
        final String endpoint = "/api/v1/marketplace/orders";
        Long buyerUserId = currentUserService.getCurrentUserId();

        if (Boolean.TRUE.equals(request.isPreOrder()) && request.requestedDeliveryDate() == null) {
            throw new BadRequestException("requestedDeliveryDate is required for pre-orders");
        }

        // 1. Resolve the exact same item selection used to obtain the quote.
        MarketplaceCheckoutItemResolver.Selection checkoutSelection =
                checkoutItemResolver.resolve(buyerUserId, request.items());
        List<MarketplaceCartItem> cartItems = checkoutSelection.items();

        // 2. Group items by the shipping invariant: seller and authoritative farm origin.
        Map<OrderShippingGroup, List<MarketplaceCartItem>> itemsByShippingGroup = cartItems.stream()
                .collect(java.util.stream.Collectors.groupingBy(
                        item -> new OrderShippingGroup(item.getFarmerUserId(), item.getProduct().getFarmId()),
                        java.util.LinkedHashMap::new,
                        java.util.stream.Collectors.toList()));

        // Resolve buyer address if addressId provided
        String shippingRecipientName = request.shippingRecipientName();
        String phoneVal = request.shippingPhone();
        String addressLineVal = request.shippingAddressLine();
        String provinceVal = request.shippingProvince();
        if (request.addressId() != null) {
            Optional<MarketplaceAddress> addressOpt = marketplaceAddressRepository.findByIdAndUserId(request.addressId(), buyerUserId);
            if (addressOpt.isPresent()) {
                MarketplaceAddress addr = addressOpt.get();
                shippingRecipientName = addr.getFullName();
                phoneVal = addr.getPhone();
                String addrLine = addr.getStreet() + ", " + addr.getWard() + ", " + addr.getDistrict() + ", " + addr.getProvince();
                if (addr.getDetail() != null && !addr.getDetail().isBlank()) {
                    addrLine = addr.getDetail() + ", " + addrLine;
                }
                addressLineVal = addrLine;
                provinceVal = addr.getProvince();
            }
        }
        final String shippingPhone = phoneVal;
        final String shippingAddressLine = addressLineVal;
        final String shippingProvince = provinceVal;
        if (shippingProvince == null || shippingProvince.isBlank()) {
            throw new BadRequestException("shippingProvince is required for authoritative shipping quotes");
        }

        if (request.shippingQuotes() == null || request.shippingQuotes().size() != itemsByShippingGroup.size()) {
            throw new BadRequestException("One accepted shipping quote is required for each seller/farm group");
        }
        Map<OrderShippingGroup, String> acceptedQuoteIds = new java.util.HashMap<>();
        for (MarketplaceCreateOrderRequest.AcceptedShippingQuote accepted : request.shippingQuotes()) {
            OrderShippingGroup key = new OrderShippingGroup(accepted.sellerUserId(), accepted.farmId());
            if (acceptedQuoteIds.putIfAbsent(key, accepted.quoteId()) != null) {
                throw new BadRequestException("Duplicate shipping quote for seller/farm group");
            }
        }
        Map<OrderShippingGroup, DeliveryShippingQuoteClient.ShippingQuote> validatedQuotes = new java.util.HashMap<>();
        for (Map.Entry<OrderShippingGroup, List<MarketplaceCartItem>> entry : itemsByShippingGroup.entrySet()) {
            String quoteId = acceptedQuoteIds.get(entry.getKey());
            if (quoteId == null) {
                throw new BadRequestException("Missing shipping quote for seller/farm group");
            }
            DeliveryShippingQuoteClient.ShippingQuote quote = marketplaceShippingQuoteService.validateAcceptedQuote(
                    quoteId, buyerUserId, entry.getKey().sellerUserId(), entry.getKey().farmId(), shippingProvince);
            validateQuoteMatchesItems(quote, entry.getValue());
            validatedQuotes.put(entry.getKey(), quote);
        }

        // 3. Create order group with PENDING_RESERVATION status
        String groupCode = "OG-" + System.currentTimeMillis() + "-" + buyerUserId;
        MarketplaceOrderGroup orderGroup = MarketplaceOrderGroup.builder()
                .groupCode(groupCode)
                .buyerUserId(buyerUserId)
                .idempotencyKey(idempotencyKey)
                .requestFingerprint(request.toString().hashCode() + "-" + buyerUserId)
                .totalAmount(BigDecimal.ZERO)
                .status("PENDING_RESERVATION")
                .build();
        orderGroup = marketplaceOrderGroupRepository.save(orderGroup);
        marketplaceOrderGroupRepository.flush();
        Long orderGroupId = orderGroup.getId();

        // 4. Create orders with PENDING_RESERVATION status (no payment yet)
        List<MarketplaceOrder> createdOrders = new ArrayList<>();
        List<MarketplaceOrderItem> allOrderItems = new ArrayList<>();

        for (Map.Entry<OrderShippingGroup, List<MarketplaceCartItem>> farmerEntry : itemsByShippingGroup.entrySet()) {
            Long farmerUserId = farmerEntry.getKey().sellerUserId();
            List<MarketplaceCartItem> farmerItems = farmerEntry.getValue();
            DeliveryShippingQuoteClient.ShippingQuote shippingQuote = validatedQuotes.get(farmerEntry.getKey());

            MarketplaceOrder order = MarketplaceOrder.builder()
                    .orderGroupId(orderGroupId)
                    .buyerUserId(buyerUserId)
                    .farmerUserId(farmerUserId)
                    .farmId(farmerEntry.getKey().farmId())
                    .status(MarketplaceOrderStatus.PENDING_RESERVATION)
                    .paymentMethod(request.paymentMethod())
                    .shippingRecipientName(shippingRecipientName)
                    .shippingPhone(shippingPhone)
                    .shippingAddressLine(shippingAddressLine)
                    .note(request.note())
                    .shippingFee(shippingQuote.shippingFeeVnd())
                    .shippingQuoteId(shippingQuote.quoteId())
                    .shippingWeightKg(shippingQuote.weightKg())
                    .shippingProviderId(shippingQuote.providerId())
                    .shippingOriginProvince(shippingQuote.senderProvince())
                    .shippingDestinationProvince(shippingQuote.recipientProvince())
                    .totalAmount(BigDecimal.ZERO)
                    .subtotal(BigDecimal.ZERO)
                    .isPreOrder(request.isPreOrder() != null ? request.isPreOrder() : false)
                    .requestedDeliveryDate(request.requestedDeliveryDate())
                    .harvestReadyDate(request.harvestReadyDate())
                    .build();
            order = marketplaceOrderRepository.save(order);
            order = marketplaceOrderRepository.saveAndFlush(order); // Ensure ID is generated

            BigDecimal orderTotal = BigDecimal.ZERO;

            for (MarketplaceCartItem cartItem : farmerItems) {
                MarketplaceProduct product = cartItem.getProduct();
                BigDecimal lineTotal = product.getPrice().multiply(cartItem.getQuantity());

                MarketplaceOrderItem orderItem = MarketplaceOrderItem.builder()
                        .order(order)
                        .productId(product.getId())
                        .farmerUserId(farmerUserId)
                        .productNameSnapshot(product.getName())
                        .productSlugSnapshot(product.getSlug())
                        .imageUrlSnapshot(product.getImageUrl())
                        .unitPriceSnapshot(product.getPrice())
                        .quantity(cartItem.getQuantity())
                        .lineTotal(lineTotal)
                        .traceableSnapshot(product.getLotId() != null)
                        .farmId(product.getFarmId())
                        .seasonId(product.getSeasonId())
                        .lotId(product.getLotId())
                        .farmName(product.getFarmName())
                        .seasonName(product.getSeasonName())
                        .lotCode(product.getLotCode())
                        .cropName(product.getName())
                        .publishedAtSnapshot(LocalDateTime.now())
                        .build();
                orderItem = marketplaceOrderItemRepository.save(orderItem);
                allOrderItems.add(orderItem);

                orderTotal = orderTotal.add(lineTotal);
            }

            order.setSubtotal(orderTotal);
            order.setTotalAmount(orderTotal.add(order.getShippingFee()));
            marketplaceOrderRepository.save(order);
            createdOrders.add(order);
        }

        // 5. Reserve stock for each individual order using its order ID
        List<MarketplaceOrder> successfulReservations = new ArrayList<>();
        boolean allReserved = true;
        String reservationFailureMessage = "";

        for (MarketplaceOrder order : createdOrders) {
            List<MarketplaceOrderItem> orderItems = marketplaceOrderItemRepository.findByOrderId(order.getId());
            List<InventoryClient.ReserveItem> reserveItems = orderItems.stream()
                    .map(item -> new InventoryClient.ReserveItem(
                            item.getId(),
                            item.getLotId(),
                            item.getLotCode(),
                            item.getQuantity(),
                            null)) // unit
                    .toList();

            String reserveIdempotencyKey = idempotencyKey + "-reserve-" + order.getId();
            try {
                InventoryClient.ReservationResult reserveResult = inventoryClient.reserveStock(
                        reserveIdempotencyKey,
                        order.getId(),
                        reserveItems);

                if (reserveResult.success()) {
                    successfulReservations.add(order);
                } else {
                    allReserved = false;
                    reservationFailureMessage = reserveResult.message();
                    break;
                }
            } catch (Exception e) {
                log.error("Exception reserving stock for orderId={}", order.getId(), e);
                allReserved = false;
                reservationFailureMessage = e.getMessage();
                break;
            }
        }

        if (!allReserved) {
            // Rollback reservations of successful ones
            for (MarketplaceOrder order : successfulReservations) {
                try {
                    inventoryClient.releaseReservation(order.getId(), "Rollback checkout failure");
                } catch (Exception e) {
                    log.error("Failed to release reservation on rollback for orderId={}", order.getId(), e);
                }
            }

            // Mark all created orders as REJECTED
            for (MarketplaceOrder order : createdOrders) {
                order.setStatus(MarketplaceOrderStatus.REJECTED);
                marketplaceOrderRepository.save(order);
            }
            orderGroup.setStatus("REJECTED");
            marketplaceOrderGroupRepository.save(orderGroup);
            throw new ConflictException("Failed to reserve stock: " + reservationFailureMessage);
        }

        // 6. Reservation successful - update to PENDING_PAYMENT
        for (MarketplaceOrder order : createdOrders) {
            order.setStatus(MarketplaceOrderStatus.PENDING_PAYMENT);
            marketplaceOrderRepository.save(order);
        }
        orderGroup.setStatus("PENDING_PAYMENT");
        orderGroup.setTotalAmount(createdOrders.stream()
                .map(MarketplaceOrder::getTotalAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add));
        marketplaceOrderGroupRepository.save(orderGroup);

        // 8. Clear the cart
        if (checkoutSelection.fromCart()) {
            marketplaceCartItemRepository.deleteAll(cartItems);
            checkoutSelection.sourceCart().setItems(new ArrayList<>());
            marketplaceCartRepository.save(checkoutSelection.sourceCart());
        }

        // 9. Record the successful response for idempotency
        BigDecimal totalAmount = orderGroup.getTotalAmount();
        MarketplaceCreateOrderResultResponse result = new MarketplaceCreateOrderResultResponse(
                orderGroupId,
                createdOrders.stream().map(MarketplaceOrder::getId).toList(),
                totalAmount,
                CURRENCY_VND,
                "Order created and stock reserved. Please complete payment.",
                null,
                createdOrders.stream()
                        .map(order -> new MarketplaceCreateOrderResultResponse.OrderShippingQuote(
                                order.getId(), order.getShippingQuoteId()))
                        .toList());

        idempotencyService.recordResponse(idempotencyKey, endpoint, result, 200);

        // 10. Publish OrderCreated events for each order
        for (MarketplaceOrder order : createdOrders) {
            List<MarketplaceOrderItem> items = marketplaceOrderItemRepository.findByOrderId(order.getId());
            publishOrderCreatedEvent(order, items);
        }

        return result;
    }

    private void validateQuoteMatchesItems(
            DeliveryShippingQuoteClient.ShippingQuote quote,
            List<MarketplaceCartItem> items) {
        if (quote == null || items == null || items.isEmpty()) {
            throw new BadRequestException("Shipping quote cannot be matched to an empty order group");
        }
        MarketplaceProduct first = items.getFirst().getProduct();
        if (first.getFarmId() == null || first.getFarmRegion() == null || first.getFarmRegion().isBlank()) {
            throw new BadRequestException("Order group has no authoritative farm origin");
        }

        BigDecimal expectedWeight = BigDecimal.ZERO;
        boolean expectedPerishable = false;
        boolean expectedColdChain = false;
        for (MarketplaceCartItem item : items) {
            MarketplaceProduct product = item.getProduct();
            if (product.getShippingWeightKgPerUnit() == null
                    || product.getShippingWeightKgPerUnit().compareTo(BigDecimal.ZERO) <= 0) {
                throw new BadRequestException("Product " + product.getId() + " has no authoritative shipping weight");
            }
            if (!Objects.equals(first.getFarmId(), product.getFarmId())
                    || !first.getFarmRegion().equalsIgnoreCase(product.getFarmRegion())) {
                throw new BadRequestException("Shipping group contains products from different farm origins");
            }
            expectedWeight = expectedWeight.add(product.getShippingWeightKgPerUnit().multiply(item.getQuantity()));
            expectedPerishable |= Boolean.TRUE.equals(product.getPerishable());
            expectedColdChain |= Boolean.TRUE.equals(product.getRequiresColdChain());
        }

        if (quote.weightKg().compareTo(expectedWeight) != 0
                || !quote.senderProvince().equalsIgnoreCase(first.getFarmRegion())
                || quote.perishable() != expectedPerishable
                || quote.requiresColdChain() != expectedColdChain) {
            throw new BadRequestException("Shipping quote no longer matches the authoritative order inputs");
        }
    }

    private void publishOrderCreatedEvent(MarketplaceOrder order, List<MarketplaceOrderItem> items) {
        List<MarketplaceOrderCreatedEvent.OrderItemPayload> itemPayloads = items.stream()
                .map(item -> new MarketplaceOrderCreatedEvent.OrderItemPayload(
                        item.getId(),
                        item.getProductId(),
                        item.getProductNameSnapshot(),
                        item.getLotCode(),
                        item.getFarmId(),
                        item.getFarmName(),
                        item.getSeasonId(),
                        item.getSeasonName(),
                        item.getQuantity().intValue(),
                        item.getUnitPriceSnapshot(),
                        item.getLineTotal()
                ))
                .toList();

        MarketplaceOrderCreatedEvent event = new MarketplaceOrderCreatedEvent(
                java.util.UUID.randomUUID().toString(),
                "MarketplaceOrder",
                order.getId().toString(),
                LocalDateTime.now(),
                new MarketplaceOrderCreatedEvent.Payload(
                        order.getOrderGroupId(),
                        order.getId(),
                        order.getBuyerUserId(),
                        order.getFarmerUserId(),
                        order.getStatus().name(),
                        itemPayloads,
                        order.getTotalAmount()
                )
        );
        domainEventPublisher.publish(event);
    }

    @Override
    @Transactional
    public MarketplaceOrderResponse uploadPaymentProof(Long orderId, MultipartFile file) {
        Long userId = currentUserService.getCurrentUserId();
        MarketplaceOrder order = marketplaceOrderRepository.findByIdAndBuyerUserId(orderId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found"));

        if (order.getPaymentVerificationStatus() == MarketplacePaymentVerificationStatus.VERIFIED) {
            throw new ConflictException("Đơn hàng đã được xác nhận thanh toán, không thể tải lại minh chứng");
        }

        // Upload payment proof to MinIO
        String paymentProofUrl = storageService.storePaymentProof(file, orderId, userId);

        // Update order with payment proof info
        order.setPaymentProofFileName(file.getOriginalFilename());
        order.setPaymentProofContentType(file.getContentType());
        order.setPaymentProofStoragePath(paymentProofUrl);
        order.setPaymentProofUploadedAt(LocalDateTime.now());

        if (order.getPaymentVerificationStatus() == MarketplacePaymentVerificationStatus.NOT_REQUIRED) {
            log.warn("Đơn hàng {} không yêu cầu minh chứng thanh toán nhưng vẫn nhận được file", orderId);
        } else {
            order.setPaymentVerificationStatus(MarketplacePaymentVerificationStatus.SUBMITTED);
        }

        order = marketplaceOrderRepository.save(order);

        // Publish PaymentSubmitted event
        publishPaymentSubmittedEvent(order, paymentProofUrl);

        return toOrderResponse(order);
    }

    private void publishPaymentSubmittedEvent(MarketplaceOrder order, String paymentProofUrl) {
        MarketplacePaymentSubmittedEvent event = new MarketplacePaymentSubmittedEvent(
                java.util.UUID.randomUUID().toString(),
                "MarketplaceOrder",
                order.getId().toString(),
                LocalDateTime.now(),
                new MarketplacePaymentSubmittedEvent.Payload(
                        order.getId(),
                        order.getBuyerUserId(),
                        order.getPaymentMethod() != null ? order.getPaymentMethod().name() : "TRANSFER",
                        paymentProofUrl
                )
        );
        domainEventPublisher.publish(event);
    }

    private void createAuditLog(String entityType, Long entityId, String operation, Long performedBy, String reason) {
        MarketplaceOrderAuditLog log = MarketplaceOrderAuditLog.builder()
                .entityType(entityType)
                .entityId(entityId)
                .operation(operation)
                .performedBy(performedBy)
                .performedAt(LocalDateTime.now())
                .reason(reason)
                .build();
        marketplaceOrderAuditLogRepository.save(log);
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponse<MarketplaceOrderResponse> listOrders(String status, int page, int size) {
        Long userId = currentUserService.getCurrentUserId();
        Pageable pageable = PageRequest.of(Math.max(0, page), Math.max(1, size), Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<MarketplaceOrder> orderPage = marketplaceOrderRepository.findByBuyerUserId(userId, pageable);

        List<MarketplaceOrderResponse> items = orderPage.getContent().stream()
                .map(this::toOrderResponse)
                .toList();

        return PageResponse.of(orderPage, items);
    }

    @Override
    @Transactional(readOnly = true)
    public MarketplaceOrderResponse getOrderDetail(Long orderId) {
        Long userId = currentUserService.getCurrentUserId();
        MarketplaceOrder order = marketplaceOrderRepository.findByIdAndBuyerUserId(orderId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found"));
        return toOrderResponse(order);
    }

    @Override
    @Transactional
    public MarketplaceOrderResponse cancelOrder(Long orderId) {
        Long userId = currentUserService.getCurrentUserId();
        MarketplaceOrder order = marketplaceOrderRepository.findByIdAndBuyerUserId(orderId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found"));

        // Release inventory reservations for this order
        InventoryClient.ReservationResult releaseResult = inventoryClient.releaseReservation(
                orderId, "Order cancelled by buyer");
        if (!releaseResult.success()) {
            log.warn("Failed to release inventory reservations for order {}: {}", orderId, releaseResult.message());
        }

        order.setStatus(MarketplaceOrderStatus.CANCELLED);
        order = marketplaceOrderRepository.save(order);

        // Publish OrderCancelled event
        publishOrderCancelledEvent(order, userId, "Cancelled by buyer");

        return toOrderResponse(order);
    }

    private void publishOrderCancelledEvent(MarketplaceOrder order, Long cancelledByUserId, String reason) {
        MarketplaceOrderCancelledEvent event = new MarketplaceOrderCancelledEvent(
                java.util.UUID.randomUUID().toString(),
                "MarketplaceOrder",
                order.getId().toString(),
                LocalDateTime.now(),
                new MarketplaceOrderCancelledEvent.Payload(
                        order.getId(),
                        order.getOrderGroupId(),
                        order.getBuyerUserId(),
                        cancelledByUserId,
                        reason
                )
        );
        domainEventPublisher.publish(event);
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponse<MarketplaceOrderResponse> listFarmerOrders(MarketplaceOrderStatus status, int page, int size) {
        Long userId = currentUserService.getCurrentUserId();
        Pageable pageable = PageRequest.of(Math.max(0, page), Math.max(1, size), Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<MarketplaceOrder> orderPage = marketplaceOrderRepository.findByFarmerUserId(userId, pageable);

        List<MarketplaceOrderResponse> items = orderPage.getContent().stream()
                .map(this::toOrderResponse)
                .toList();

        return PageResponse.of(orderPage, items);
    }

    @Override
    @Transactional(readOnly = true)
    public MarketplaceOrderResponse getFarmerOrderDetail(Long orderId) {
        Long userId = currentUserService.getCurrentUserId();
        MarketplaceOrder order = marketplaceOrderRepository.findByIdAndFarmerUserId(orderId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found"));
        return toOrderResponse(order);
    }

    @Override
    @Transactional
    public MarketplaceOrderResponse updateFarmerOrderStatus(Long orderId, MarketplaceUpdateOrderStatusRequest request) {
        Long userId = currentUserService.getCurrentUserId();
        MarketplaceOrder order = marketplaceOrderRepository.findByIdAndFarmerUserId(orderId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found"));

        order.setStatus(request.status());
        order = marketplaceOrderRepository.save(order);

        // Confirm inventory stock-out when order is confirmed/completed
        if (request.status() == MarketplaceOrderStatus.CONFIRMED ||
            request.status() == MarketplaceOrderStatus.COMPLETED) {
            InventoryClient.ReservationResult confirmResult = inventoryClient.confirmStockOut(
                    orderId, "Order " + request.status().name().toLowerCase() + " by farmer");
            if (!confirmResult.success()) {
                log.warn("Failed to confirm stock-out for order {}: {}", orderId, confirmResult.message());
            }
        }

        // Publish OrderCompleted event
        if (request.status() == MarketplaceOrderStatus.COMPLETED) {
            publishOrderCompletedEvent(order);
        }

        return toOrderResponse(order);
    }

    private void publishOrderCompletedEvent(MarketplaceOrder order) {
        MarketplaceOrderCompletedEvent event = new MarketplaceOrderCompletedEvent(
                java.util.UUID.randomUUID().toString(),
                "MarketplaceOrder",
                order.getId().toString(),
                LocalDateTime.now(),
                new MarketplaceOrderCompletedEvent.Payload(
                        order.getId(),
                        order.getOrderGroupId(),
                        order.getBuyerUserId(),
                        order.getFarmerUserId(),
                        LocalDateTime.now().toString()
                )
        );
        domainEventPublisher.publish(event);
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponse<MarketplaceOrderResponse> listAdminOrders(MarketplaceOrderStatus status, int page, int size) {
        Pageable pageable = PageRequest.of(Math.max(0, page), Math.max(1, size), Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<MarketplaceOrder> orderPage = marketplaceOrderRepository.findAll(pageable);

        List<MarketplaceOrderResponse> items = orderPage.getContent().stream()
                .map(this::toOrderResponse)
                .toList();

        return PageResponse.of(orderPage, items);
    }

    @Override
    @Transactional(readOnly = true)
    public MarketplaceOrderResponse getAdminOrderDetail(Long orderId) {
        MarketplaceOrder order = marketplaceOrderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found"));
        return toOrderResponse(order);
    }

    @Override
    @Transactional
    public MarketplaceOrderResponse updateAdminOrderStatus(Long orderId, MarketplaceUpdateOrderStatusRequest request) {
        MarketplaceOrder order = marketplaceOrderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found"));

        order.setStatus(request.status());
        order = marketplaceOrderRepository.save(order);

        if (request.status() == MarketplaceOrderStatus.COMPLETED) {
            publishOrderCompletedEvent(order);
        } else if (request.status() == MarketplaceOrderStatus.CANCELLED) {
            publishOrderCancelledEvent(order, currentUserService.getCurrentUserId(), "Cancelled by admin");
        }

        return toOrderResponse(order);
    }

    @Override
    @Transactional
    public MarketplaceOrderResponse updateAdminPaymentVerification(Long orderId, MarketplaceUpdatePaymentVerificationRequest request) {
        MarketplaceOrder order = marketplaceOrderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found"));

        order.setPaymentVerificationStatus(request.verificationStatus());
        if (request.verificationNote() != null) {
            order.setPaymentVerificationNote(request.verificationNote());
        }
        order = marketplaceOrderRepository.save(order);

        return toOrderResponse(order);
    }

    @Override
    @Transactional(readOnly = true)
    public List<MarketplaceOrderAuditLogResponse> listOrderAuditLogs(Long orderId) {
        List<MarketplaceOrderAuditLog> logs = marketplaceOrderAuditLogRepository
                .findByEntityTypeAndEntityIdOrderByPerformedAtDesc("MarketplaceOrder", orderId);
        return logs.stream()
                .map(log -> new MarketplaceOrderAuditLogResponse(
                        log.getId(),
                        log.getEntityType(),
                        Math.toIntExact(log.getEntityId()),
                        log.getOperation(),
                        log.getPerformedBy() != null ? "User " + log.getPerformedBy() : "System",
                        log.getPerformedAt(),
                        log.getSnapshotDataJson(),
                        log.getReason(),
                        log.getIpAddress()))
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public MarketplaceAdminStatsResponse getAdminStats() {
        // Product stats
        long totalProducts = marketplaceProductRepository.count();
        long pendingReviewProducts = marketplaceProductRepository.countByStatus(MarketplaceProductStatus.PENDING_REVIEW);
        long publishedProducts = marketplaceProductRepository.countByStatus(MarketplaceProductStatus.PUBLISHED)
                + marketplaceProductRepository.countByStatus(MarketplaceProductStatus.ACTIVE);
        long hiddenProducts = marketplaceProductRepository.countByStatus(MarketplaceProductStatus.HIDDEN)
                + marketplaceProductRepository.countByStatus(MarketplaceProductStatus.INACTIVE);

        // Order stats
        long totalOrders = marketplaceOrderRepository.count();
        long activeOrders = marketplaceOrderRepository.countByStatus(MarketplaceOrderStatus.PENDING_PAYMENT)
                + marketplaceOrderRepository.countByStatus(MarketplaceOrderStatus.CONFIRMED)
                + marketplaceOrderRepository.countByStatus(MarketplaceOrderStatus.PREPARING)
                + marketplaceOrderRepository.countByStatus(MarketplaceOrderStatus.SHIPPED)
                + marketplaceOrderRepository.countByStatus(MarketplaceOrderStatus.DELIVERED);
        long completedOrders = marketplaceOrderRepository.countByStatus(MarketplaceOrderStatus.COMPLETED);
        long cancelledOrders = marketplaceOrderRepository.countByStatus(MarketplaceOrderStatus.CANCELLED)
                + marketplaceOrderRepository.countByStatus(MarketplaceOrderStatus.REJECTED);
        long pendingPaymentVerificationOrders = marketplaceOrderRepository.countByPaymentVerificationStatus(
                MarketplacePaymentVerificationStatus.SUBMITTED);

        // Revenue (completed orders)
        BigDecimal totalRevenue = marketplaceOrderRepository.sumTotalAmountByStatus(MarketplaceOrderStatus.COMPLETED);
        if (totalRevenue == null) {
            totalRevenue = BigDecimal.ZERO;
        }

        // Last order time
        java.time.LocalDateTime lastOrderAt = marketplaceOrderRepository.findTopByOrderByCreatedAtDesc()
                .map(MarketplaceOrder::getCreatedAt)
                .orElse(null);

        List<String> unavailableReasons = new ArrayList<>();
        if (totalProducts == 0) unavailableReasons.add("No products in marketplace");
        if (totalOrders == 0) unavailableReasons.add("No orders yet");
        if (completedOrders == 0) unavailableReasons.add("No completed orders for revenue data");

        return new MarketplaceAdminStatsResponse(
                totalProducts,
                pendingReviewProducts,
                publishedProducts,
                hiddenProducts,
                totalOrders,
                activeOrders,
                completedOrders,
                cancelledOrders,
                pendingPaymentVerificationOrders,
                totalRevenue,
                totalProducts > 0,
                totalOrders > 0,
                completedOrders > 0,
                lastOrderAt,
                unavailableReasons);
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponse<MarketplacePaymentProofResponse> listAdminPaymentProofs(int page, int size) {
        Pageable pageable = PageRequest.of(Math.max(0, page), Math.max(1, size));
        Page<MarketplaceOrder> orderPage = marketplaceOrderRepository.findByPaymentVerificationStatus(
                MarketplacePaymentVerificationStatus.SUBMITTED, pageable);

        List<MarketplacePaymentProofResponse> items = orderPage.getContent().stream()
                .map(this::toPaymentProofResponse)
                .toList();

        return PageResponse.of(orderPage, items);
    }

    @Override
    @Transactional(readOnly = true)
    public MarketplacePaymentProofResponse getPaymentProof(Long orderId) {
        Long userId = currentUserService.getCurrentUserId();
        MarketplaceOrder order = marketplaceOrderRepository.findByIdAndBuyerUserId(orderId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found"));
        return toPaymentProofResponse(order);
    }

    @Override
    @Transactional
    public MarketplacePaymentProofResponse verifyAdminPaymentProof(Long orderId) {
        MarketplaceOrder order = marketplaceOrderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found"));
        order.setPaymentVerificationStatus(MarketplacePaymentVerificationStatus.VERIFIED);
        order = marketplaceOrderRepository.save(order);

        // Publish PaymentVerified event
        publishPaymentVerifiedEvent(order, currentUserService.getCurrentUserId());

        return toPaymentProofResponse(order);
    }

    private void publishPaymentVerifiedEvent(MarketplaceOrder order, Long verifiedByUserId) {
        MarketplacePaymentVerifiedEvent event = new MarketplacePaymentVerifiedEvent(
                java.util.UUID.randomUUID().toString(),
                "MarketplaceOrder",
                order.getId().toString(),
                LocalDateTime.now(),
                new MarketplacePaymentVerifiedEvent.Payload(
                        order.getId(),
                        order.getBuyerUserId(),
                        verifiedByUserId,
                        "VERIFIED"
                )
        );
        domainEventPublisher.publish(event);
    }

    @Override
    @Transactional
    public MarketplacePaymentProofResponse rejectAdminPaymentProof(Long orderId, MarketplaceRejectPaymentProofRequest request) {
        MarketplaceOrder order = marketplaceOrderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found"));
        order.setPaymentVerificationStatus(MarketplacePaymentVerificationStatus.REJECTED);
        order.setPaymentVerificationNote(request.reason());
        order = marketplaceOrderRepository.save(order);
        return toPaymentProofResponse(order);
    }

    @Override
    @Transactional(readOnly = true)
    public List<MarketplaceAddressResponse> listAddresses() {
        Long userId = currentUserService.getCurrentUserId();
        List<MarketplaceAddress> addresses = marketplaceAddressRepository.findByUserId(userId);
        return addresses.stream()
                .map(this::toAddressResponse)
                .toList();
    }

    @Override
    @Transactional
    public MarketplaceAddressResponse createAddress(MarketplaceAddressUpsertRequest request) {
        Long userId = currentUserService.getCurrentUserId();

        MarketplaceAddress address = MarketplaceAddress.builder()
                .userId(userId)
                .fullName(request.fullName())
                .phone(request.phone())
                .province(request.province())
                .district(request.district())
                .ward(request.ward())
                .street(request.street())
                .detail(request.detail())
                .label(request.label())
                .isDefault(request.isDefault() != null ? request.isDefault() : false)
                .build();

        address = marketplaceAddressRepository.save(address);
        return toAddressResponse(address);
    }

    @Override
    @Transactional
    public MarketplaceAddressResponse updateAddress(Long addressId, MarketplaceAddressUpsertRequest request) {
        Long userId = currentUserService.getCurrentUserId();
        MarketplaceAddress address = marketplaceAddressRepository.findByIdAndUserId(addressId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Address not found"));

        address.setFullName(request.fullName());
        address.setPhone(request.phone());
        address.setProvince(request.province());
        address.setDistrict(request.district());
        address.setWard(request.ward());
        address.setStreet(request.street());
        address.setDetail(request.detail());
        address.setLabel(request.label());
        if (request.isDefault() != null) {
            address.setIsDefault(request.isDefault());
        }

        address = marketplaceAddressRepository.save(address);
        return toAddressResponse(address);
    }

    @Override
    @Transactional
    public MarketplaceAddressResponse setDefaultAddress(Long addressId) {
        Long userId = currentUserService.getCurrentUserId();
        List<MarketplaceAddress> addresses = marketplaceAddressRepository.findByUserId(userId);

        for (MarketplaceAddress addr : addresses) {
            addr.setIsDefault(addr.getId().equals(addressId));
        }
        marketplaceAddressRepository.saveAll(addresses);

        MarketplaceAddress address = marketplaceAddressRepository.findById(addressId)
                .orElseThrow(() -> new ResourceNotFoundException("Address not found"));
        return toAddressResponse(address);
    }

    @Override
    @Transactional
    public void deleteAddress(Long addressId) {
        Long userId = currentUserService.getCurrentUserId();
        marketplaceAddressRepository.deleteByIdAndUserId(addressId, userId);
    }

    @Override
    @Transactional(readOnly = true)
    public MarketplaceFarmerDashboardResponse getFarmerDashboard() {
        Long userId = currentUserService.getCurrentUserId();

        // Product stats
        long totalProducts = marketplaceProductRepository.countByFarmerUserId(userId);
        long pendingReviewProducts = marketplaceProductRepository.countByFarmerUserIdAndStatus(userId, MarketplaceProductStatus.PENDING_REVIEW);
        long publishedProducts = marketplaceProductRepository.countByFarmerUserIdAndStatus(userId, MarketplaceProductStatus.PUBLISHED)
                + marketplaceProductRepository.countByFarmerUserIdAndStatus(userId, MarketplaceProductStatus.ACTIVE);
        long lowStockProducts = 0; // Would need inventory integration

        // Order stats
        long pendingOrders = marketplaceOrderRepository.countByFarmerUserIdAndStatus(userId, MarketplaceOrderStatus.PENDING_PAYMENT);

        // Revenue
        Page<MarketplaceOrder> completedOrders = marketplaceOrderRepository.findByFarmerUserIdAndStatus(
                userId, MarketplaceOrderStatus.COMPLETED, PageRequest.of(0, 100));
        BigDecimal totalRevenue = completedOrders.stream()
                .map(MarketplaceOrder::getTotalAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        // Last order
        LocalDateTime lastOrderAt = completedOrders.stream()
                .map(MarketplaceOrder::getCreatedAt)
                .max(LocalDateTime::compareTo)
                .orElse(null);

        // Recent orders (last 5)
        Page<MarketplaceOrder> recentOrdersPage = marketplaceOrderRepository.findByFarmerUserId(
                userId, PageRequest.of(0, 5, Sort.by(Sort.Direction.DESC, "createdAt")));
        List<MarketplaceOrderResponse> recentOrders = recentOrdersPage.getContent().stream()
                .map(this::toOrderResponse)
                .toList();

        List<String> unavailableReasons = new ArrayList<>();
        if (totalProducts == 0) unavailableReasons.add("No products listed");
        if (pendingOrders == 0) unavailableReasons.add("No pending orders");
        if (completedOrders.getTotalElements() == 0) unavailableReasons.add("No completed orders");

        return new MarketplaceFarmerDashboardResponse(
                totalProducts,
                pendingReviewProducts,
                publishedProducts,
                lowStockProducts,
                pendingOrders,
                totalRevenue,
                totalProducts > 0,
                pendingOrders > 0 || completedOrders.getTotalElements() > 0,
                completedOrders.getTotalElements() > 0,
                lastOrderAt,
                unavailableReasons,
                recentOrders);
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponse<MarketplaceProductSummaryResponse> listFarmerProducts(
            String q, MarketplaceProductStatus status, int page, int size) {
        Long userId = currentUserService.getCurrentUserId();
        Pageable pageable = PageRequest.of(Math.max(0, page), Math.max(1, size));
        Page<MarketplaceProduct> productPage = marketplaceProductRepository.findByFarmerUserId(userId, pageable);

        List<MarketplaceProductSummaryResponse> items = productPage.getContent().stream()
                .map(this::toProductSummary)
                .toList();

        return PageResponse.of(productPage, items);
    }

    @Override
    @Transactional(readOnly = true)
    public MarketplaceFarmerProductFormOptionsResponse getFarmerProductFormOptions() {
        Long userId = currentUserService.getCurrentUserId();

        List<MarketplaceFarmerProductFormFarmOptionResponse> farms = new ArrayList<>();
        try {
            List<Integer> farmIds = farmClient.getFarmIdsByUserId(userId);
            if (farmIds != null && !farmIds.isEmpty()) {
                List<FarmSummaryDto> farmDtos = farmClient.getFarmsByIds(farmIds);
                for (FarmSummaryDto dto : farmDtos) {
                    if (dto != null) {
                        farms.add(new MarketplaceFarmerProductFormFarmOptionResponse(dto.id(), dto.name()));
                    }
                }
            }
        } catch (Exception e) {
            log.warn("Failed to fetch farms: {}", e.getMessage());
        }

        List<MarketplaceFarmerProductFormSeasonOptionResponse> seasons = new ArrayList<>();
        try {
            List<Integer> seasonIds = seasonClient.getSeasonIdsByOwnerId(userId);
            if (seasonIds != null && !seasonIds.isEmpty()) {
                List<SeasonDetailDto> seasonDtos = seasonClient.getSeasonsByIds(seasonIds);
                for (SeasonDetailDto dto : seasonDtos) {
                    if (dto != null) {
                        seasons.add(new MarketplaceFarmerProductFormSeasonOptionResponse(dto.id(), dto.seasonName(), dto.farmId()));
                    }
                }
            }
        } catch (Exception e) {
            log.warn("Failed to fetch seasons: {}", e.getMessage());
        }

        List<MarketplaceFarmerProductFormLotOptionResponse> lots = new ArrayList<>();
        try {
            List<Integer> seasonIds = seasonClient.getSeasonIdsByOwnerId(userId);
            if (seasonIds != null && !seasonIds.isEmpty()) {
                List<InventoryClient.LotDetailDto> lotDtos = inventoryClient.getLotsBySeasonIds(seasonIds);
                if (lotDtos != null && !lotDtos.isEmpty()) {
                    List<Integer> lotIds = lotDtos.stream().map(InventoryClient.LotDetailDto::id).toList();
                    List<MarketplaceProduct> linkedProducts = marketplaceProductRepository.findByLotIdIn(lotIds);
                    Map<Integer, MarketplaceProduct> productByLotId = linkedProducts.stream()
                            .collect(java.util.stream.Collectors.toMap(MarketplaceProduct::getLotId, p -> p, (p1, p2) -> p1));

                    Map<Integer, String> farmNameById = farms.stream()
                            .collect(java.util.stream.Collectors.toMap(
                                    MarketplaceFarmerProductFormFarmOptionResponse::id,
                                    MarketplaceFarmerProductFormFarmOptionResponse::name,
                                    (n1, n2) -> n1
                            ));

                    Map<Integer, String> seasonNameById = seasons.stream()
                            .collect(java.util.stream.Collectors.toMap(
                                    MarketplaceFarmerProductFormSeasonOptionResponse::id,
                                    MarketplaceFarmerProductFormSeasonOptionResponse::seasonName,
                                    (n1, n2) -> n1
                            ));

                    for (InventoryClient.LotDetailDto lotDto : lotDtos) {
                        if (lotDto != null) {
                            MarketplaceProduct linkedProduct = productByLotId.get(lotDto.id());
                            Long linkedProductId = linkedProduct != null ? linkedProduct.getId() : null;
                            org.example.marketplace.model.MarketplaceProductStatus linkedProductStatus = 
                                    linkedProduct != null ? linkedProduct.getStatus() : null;

                            String farmName = farmNameById.get(lotDto.farmId());
                            String seasonName = seasonNameById.get(lotDto.seasonId());

                            lots.add(new MarketplaceFarmerProductFormLotOptionResponse(
                                    lotDto.id(),
                                    lotDto.lotCode(),
                                    lotDto.farmId(),
                                    farmName,
                                    lotDto.seasonId(),
                                    seasonName,
                                    lotDto.onHandQuantity(),
                                    null,
                                    lotDto.unit(),
                                    lotDto.productName(),
                                    lotDto.productVariant(),
                                    linkedProductId,
                                    linkedProductStatus
                            ));
                        }
                    }
                }
            }
        } catch (Exception e) {
            log.warn("Failed to fetch lots: {}", e.getMessage());
        }

        return new MarketplaceFarmerProductFormOptionsResponse(farms, seasons, lots);
    }

    @Override
    @Transactional(readOnly = true)
    public MarketplaceProductDetailResponse getFarmerProductDetail(Long productId) {
        Long userId = currentUserService.getCurrentUserId();
        MarketplaceProduct product = marketplaceProductRepository.findByIdAndFarmerUserId(productId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Product not found"));
        return toProductDetail(product);
    }

    @Override
    @Transactional
    public MarketplaceProductDetailResponse createFarmerProduct(MarketplaceFarmerProductUpsertRequest request) {
        Long userId = currentUserService.getCurrentUserId();

        MarketplaceProduct product = MarketplaceProduct.builder()
                .name(request.name())
                .category(request.category())
                .shortDescription(request.shortDescription())
                .description(request.description())
                .price(request.price())
                .stockQuantity(request.stockQuantity())
                .shippingWeightKgPerUnit(request.shippingWeightKgPerUnit())
                .perishable(request.perishable())
                .requiresColdChain(request.requiresColdChain())
                .imageUrl(request.imageUrl())
                .farmerUserId(userId)
                .lotId(request.lotId())
                .status(MarketplaceProductStatus.DRAFT)
                .traceable(true)
                .averageRating(0.0)
                .ratingCount(0)
                .build();

        populateTraceabilityFields(product);
        product = marketplaceProductRepository.save(product);
        publishProductChangedEvent(product);
        return toProductDetail(product);
    }

    @Override
    @Transactional
    public MarketplaceProductDetailResponse updateFarmerProduct(Long productId, MarketplaceFarmerProductUpsertRequest request) {
        Long userId = currentUserService.getCurrentUserId();
        MarketplaceProduct product = marketplaceProductRepository.findByIdAndFarmerUserId(productId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Product not found"));

        product.setName(request.name());
        product.setCategory(request.category());
        product.setShortDescription(request.shortDescription());
        product.setDescription(request.description());
        product.setPrice(request.price());
        product.setStockQuantity(request.stockQuantity());
        product.setShippingWeightKgPerUnit(request.shippingWeightKgPerUnit());
        product.setPerishable(request.perishable());
        product.setRequiresColdChain(request.requiresColdChain());
        product.setImageUrl(request.imageUrl());
        product.setLotId(request.lotId());

        populateTraceabilityFields(product);
        product = marketplaceProductRepository.save(product);
        publishProductChangedEvent(product);
        return toProductDetail(product);
    }

    private void populateTraceabilityFields(MarketplaceProduct product) {
        if (product == null) return;

        try {
            String displayName = identityClient.getUserDisplayName(product.getFarmerUserId());
            product.setFarmerDisplayName(displayName);
        } catch (Exception e) {
            log.warn("Failed to populate farmer display name: {}", e.getMessage());
        }

        if (product.getLotId() != null) {
            try {
                InventoryClient.LotDetailDto lotDto = inventoryClient.getLotDetail(product.getLotId());
                if (lotDto != null) {
                    product.setLotCode(lotDto.lotCode());
                    product.setUnit(lotDto.unit());
                    product.setLotInitialQuantity(lotDto.initialQuantity());
                    product.setLotGrade(lotDto.status());
                    product.setFarmId(lotDto.farmId());
                    product.setSeasonId(lotDto.seasonId());

                    if (lotDto.farmId() != null) {
                        try {
                            FarmDetailDto farmDto = farmClient.getFarmDetail(lotDto.farmId());
                            if (farmDto != null) {
                                product.setFarmName(farmDto.name());
                                product.setFarmRegion(farmDto.provinceName());
                            }
                        } catch (Exception e) {
                            log.warn("Failed to populate farm details for farmId={}: {}", lotDto.farmId(), e.getMessage());
                        }
                    }

                    if (lotDto.seasonId() != null) {
                        try {
                            SeasonDetailDto seasonDto = seasonClient.getSeasonDetail(lotDto.seasonId());
                            if (seasonDto != null) {
                                product.setSeasonName(seasonDto.seasonName());
                                product.setCropName(seasonDto.cropName());
                            }
                        } catch (Exception e) {
                            log.warn("Failed to populate season details for seasonId={}: {}", lotDto.seasonId(), e.getMessage());
                        }
                    }
                }
            } catch (Exception e) {
                log.warn("Failed to populate lot details for lotId={}: {}", product.getLotId(), e.getMessage());
            }
        }
    }

    @Override
    @Transactional
    public MarketplaceProductDetailResponse updateFarmerProductStatus(Long productId, MarketplaceUpdateProductStatusRequest request) {
        Long userId = currentUserService.getCurrentUserId();
        MarketplaceProduct product = marketplaceProductRepository.findByIdAndFarmerUserId(productId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Product not found"));

        validateFarmerProductStatusTransition(product.getStatus(), request.status());
        product.setStatus(request.status());
        if (request.statusReason() != null) {
            product.setStatusReason(request.statusReason());
        }
        product.setStatusChangedAt(LocalDateTime.now());
        product.setStatusChangedByUserId(userId);

        product = marketplaceProductRepository.save(product);
        publishProductChangedEvent(product);
        return toProductDetail(product);
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponse<MarketplaceProductSummaryResponse> listAdminProducts(
            String q, MarketplaceProductStatus status, int page, int size) {
        Pageable pageable = PageRequest.of(Math.max(0, page), Math.max(1, size));
        Page<MarketplaceProduct> productPage = marketplaceProductRepository.findAll(pageable);

        List<MarketplaceProductSummaryResponse> items = productPage.getContent().stream()
                .map(this::toProductSummary)
                .toList();

        return PageResponse.of(productPage, items);
    }

    @Override
    @Transactional(readOnly = true)
    public MarketplaceProductDetailResponse getAdminProductDetail(Long productId) {
        MarketplaceProduct product = marketplaceProductRepository.findById(productId)
                .orElseThrow(() -> new ResourceNotFoundException("Product not found"));
        return toProductDetail(product);
    }

    @Override
    @Transactional
    public MarketplaceProductDetailResponse updateAdminProductStatus(Long productId, MarketplaceUpdateProductStatusRequest request) {
        MarketplaceProduct product = marketplaceProductRepository.findById(productId)
                .orElseThrow(() -> new ResourceNotFoundException("Product not found"));

        if (isSellableStatus(request.status())) {
            org.example.marketplace.dto.response.ComplianceCheckResponse complianceCheck = complianceGateService.checkCompliance(product);
            if (!complianceCheck.isEligible()) {
                throw new org.example.marketplace.exception.ConflictException("Compliance check failed: " + String.join("; ", complianceCheck.reasons()));
            }
            // Update snapshots
            product.setComplianceClaim(complianceCheck.complianceClaim());
            product.setCertificationSnapshotJson(complianceCheck.certificationSnapshotJson());
            product.setHarvestSafetySnapshotJson(complianceCheck.harvestSafetySnapshotJson());
            product.setComplianceCheckedAt(LocalDateTime.now());
            if (product.getPublishedAt() == null) {
                product.setPublishedAt(LocalDateTime.now());
            }
        }

        product.setStatus(request.status());
        if (request.statusReason() != null) {
            product.setStatusReason(request.statusReason());
        }
        product.setStatusChangedAt(LocalDateTime.now());
        product.setStatusChangedByUserId(currentUserService.getCurrentUserId());

        product = marketplaceProductRepository.save(product);
        publishProductChangedEvent(product);
        return toProductDetail(product);
    }

    private void validateFarmerProductStatusTransition(
            MarketplaceProductStatus currentStatus,
            MarketplaceProductStatus requestedStatus) {
        boolean allowed = switch (currentStatus) {
            case DRAFT -> requestedStatus == MarketplaceProductStatus.PENDING_REVIEW;
            case PENDING_REVIEW -> requestedStatus == MarketplaceProductStatus.DRAFT;
            case ACTIVE, PUBLISHED -> requestedStatus == MarketplaceProductStatus.INACTIVE;
            case INACTIVE, HIDDEN, REJECTED, SOLD_OUT ->
                    requestedStatus == MarketplaceProductStatus.PENDING_REVIEW;
        };

        if (!allowed) {
            throw new ConflictException(
                    "Farmer product status transition is not allowed: " + currentStatus + " -> " + requestedStatus);
        }
    }

    private boolean isSellableStatus(MarketplaceProductStatus status) {
        return status == MarketplaceProductStatus.ACTIVE || status == MarketplaceProductStatus.PUBLISHED;
    }

    @Override
    @Transactional(readOnly = true)
    public org.example.marketplace.dto.response.ComplianceCheckResponse checkProductCompliance(Long productId) {
        MarketplaceProduct product = marketplaceProductRepository.findById(productId)
                .orElseThrow(() -> new ResourceNotFoundException("Product not found"));
        return complianceGateService.checkCompliance(product);
    }

    private void publishProductChangedEvent(MarketplaceProduct product) {
        if (product == null) return;
        MarketplaceProductChangedEvent event = new MarketplaceProductChangedEvent(
                java.util.UUID.randomUUID().toString(),
                "MarketplaceProduct",
                product.getId().toString(),
                LocalDateTime.now(),
                new MarketplaceProductChangedEvent.Payload(
                        product.getId(),
                        product.getName(),
                        product.getFarmId(),
                        product.getFarmName(),
                        product.getFarmerUserId(),
                        product.getFarmerDisplayName(),
                        product.getStatus() != null ? product.getStatus().name() : null,
                        product.getUpdatedAt() != null ? product.getUpdatedAt().toString() : LocalDateTime.now().toString()
                )
        );
        domainEventPublisher.publish(event);
    }

    // ==================== Helper Methods ====================

    private MarketplaceCart getOrCreateCart(Long userId) {
        return marketplaceCartRepository.findByUserId(userId)
                .orElseGet(() -> {
                    MarketplaceCart cart = MarketplaceCart.builder()
                            .userId(userId)
                            .build();
                    return marketplaceCartRepository.save(cart);
                });
    }

    private MarketplaceCartResponse buildCartResponse(Long userId, MarketplaceCart cart) {
        List<MarketplaceCartItem> items = marketplaceCartItemRepository.findByCartId(cart.getId());

        List<org.example.marketplace.dto.response.MarketplaceCartItemResponse> itemResponses = items.stream()
                .map(item -> new org.example.marketplace.dto.response.MarketplaceCartItemResponse(
                        item.getProduct().getId(),
                        item.getProduct().getSlug(),
                        item.getProduct().getName(),
                        item.getProduct().getImageUrl(),
                        item.getUnitPriceSnapshot(),
                        item.getQuantity(),
                        item.getProduct().getStockQuantity(),
                        item.getProduct().getFarmerUserId(),
                        item.getProduct().getTraceable()))
                .toList();

        BigDecimal subtotal = items.stream()
                .map(item -> item.getUnitPriceSnapshot().multiply(item.getQuantity()))
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        return new MarketplaceCartResponse(
                userId,
                itemResponses,
                List.of(), // sellerGroups - TODO
                BigDecimal.valueOf(items.size()),
                subtotal,
                CURRENCY_VND);
    }

    private MarketplaceCartResponse emptyCart(Long userId) {
        return new MarketplaceCartResponse(
                userId,
                List.of(),
                List.of(),
                BigDecimal.ZERO,
                BigDecimal.ZERO,
                CURRENCY_VND);
    }

    private MarketplaceProductSummaryResponse toProductSummary(MarketplaceProduct product) {
        return new MarketplaceProductSummaryResponse(
                product.getId(),
                product.getSlug(),
                product.getName(),
                product.getCategory(),
                product.getShortDescription(),
                product.getPrice(),
                product.getUnit(),
                product.getStockQuantity(),
                product.getStockQuantity(),
                product.getImageUrl(),
                product.getFarmerUserId(),
                product.getFarmerDisplayName(),
                product.getFarmId(),
                product.getFarmName(),
                product.getSeasonId(),
                product.getSeasonName(),
                product.getLotId(),
                product.getFarmRegion(),
                product.getTraceable(),
                product.getAverageRating(),
                (long) product.getRatingCount(),
                product.getStatus(),
                product.getStatusReason(),
                product.getPublishedAt(),
                product.getStatusChangedAt(),
                product.getAllowsPreOrder(),
                product.getEarliestFulfillmentDate(),
                true,
                List.of(),
                product.getCreatedAt(),
                product.getUpdatedAt());
    }

    private MarketplaceProductDetailResponse toProductDetail(MarketplaceProduct product) {
        return new MarketplaceProductDetailResponse(
                product.getId(),
                product.getSlug(),
                product.getName(),
                product.getCategory(),
                product.getShortDescription(),
                product.getDescription(),
                product.getPrice(),
                product.getUnit(),
                product.getStockQuantity(),
                product.getStockQuantity(),
                product.getShippingWeightKgPerUnit(),
                product.getPerishable(),
                product.getRequiresColdChain(),
                product.getImageUrl(),
                null, // imageUrls
                product.getFarmerUserId(),
                product.getFarmerDisplayName(),
                product.getFarmId(),
                product.getFarmName(),
                product.getSeasonId(),
                product.getSeasonName(),
                product.getLotId(),
                product.getFarmRegion(),
                product.getTraceable(),
                null, // traceabilityCode
                product.getAverageRating(),
                (long) product.getRatingCount(),
                product.getStatus(),
                product.getStatusReason(),
                product.getPublishedAt(),
                product.getStatusChangedAt(),
                product.getAllowsPreOrder(),
                product.getEarliestFulfillmentDate(),
                true,
                List.of(),
                product.getCreatedAt(),
                product.getUpdatedAt());
    }

    private MarketplaceReviewResponse toReviewResponse(MarketplaceProductReview review) {
        return new MarketplaceReviewResponse(
                review.getId(),
                review.getProductId(),
                review.getOrderId(),
                review.getOrderItemId(),
                review.getBuyerUserId(),
                review.getBuyerDisplayName(),
                review.getRating(),
                review.getComment(),
                review.getHidden(),
                review.getCreatedAt(),
                review.getUpdatedAt());
    }

    private MarketplaceOrderResponse toOrderResponse(MarketplaceOrder order) {
        List<MarketplaceOrderItem> items = marketplaceOrderItemRepository.findByOrderId(order.getId());

        List<MarketplaceOrderItemResponse> itemResponses = items.stream()
                .map(item -> new MarketplaceOrderItemResponse(
                        item.getId(),
                        item.getProductId(),
                        item.getProductNameSnapshot(),
                        null, // slug
                        item.getImageUrlSnapshot(),
                        item.getUnitPriceSnapshot(),
                        item.getQuantity(),
                        item.getLineTotal(),
                        item.getTraceableSnapshot(),
                        false, // canReview
                        null)) // reviewId
                .toList();

        return new MarketplaceOrderResponse(
                order.getId(),
                order.getOrderCode(),
                order.getOrderGroupId() != null ? order.getOrderGroupId().toString() : null,
                order.getBuyerUserId(),
                order.getFarmerUserId(),
                order.getStatus(),
                new MarketplaceOrderPaymentResponse(
                        order.getPaymentMethod(),
                        order.getPaymentVerificationStatus(),
                        order.getPaymentProofFileName(),
                        order.getPaymentProofContentType(),
                        order.getPaymentProofStoragePath(),
                        order.getPaymentProofUploadedAt(),
                        order.getPaymentVerifiedAt(),
                        order.getPaymentVerifiedByUserId(),
                        order.getPaymentVerificationNote()
                ),
                order.getShippingRecipientName(),
                order.getShippingPhone(),
                order.getShippingAddressLine(),
                order.getNote(),
                order.getSubtotal(),
                order.getShippingFee(),
                order.getTotalAmount(),
                canCancel(order),
                order.getIsPreOrder(),
                order.getRequestedDeliveryDate(),
                order.getHarvestReadyDate(),
                order.getCreatedAt(),
                order.getUpdatedAt(),
                itemResponses);
    }

    private boolean canCancel(MarketplaceOrder order) {
        return order.getStatus() == MarketplaceOrderStatus.PENDING_PAYMENT
                || order.getStatus() == MarketplaceOrderStatus.PAYMENT_SUBMITTED
                || order.getStatus() == MarketplaceOrderStatus.CONFIRMED;
    }

    private MarketplacePaymentProofResponse toPaymentProofResponse(MarketplaceOrder order) {
        return new MarketplacePaymentProofResponse(
                order.getId(),
                order.getOrderCode(),
                order.getBuyerUserId(),
                null, // proofFileName
                null, // proofContentType
                order.getPaymentProofStoragePath(),
                order.getPaymentProofUploadedAt(),
                order.getPaymentVerificationStatus(),
                order.getPaymentVerificationNote(),
                order.getPaymentVerifiedAt(),
                order.getPaymentVerifiedByUserId());
    }

    private MarketplaceAddressResponse toAddressResponse(MarketplaceAddress address) {
        return new MarketplaceAddressResponse(
                address.getId(),
                address.getUserId(),
                address.getFullName(),
                address.getPhone(),
                address.getProvince(),
                address.getDistrict(),
                address.getWard(),
                address.getStreet(),
                address.getDetail(),
                address.getLabel(),
                address.getIsDefault());
    }

    private MarketplaceTraceabilityResponse buildTraceabilityResponse(MarketplaceProduct product, MarketplaceOrderItem orderItem) {
        Long productId;
        Boolean traceable;

        MarketplaceTraceabilityResponse.FarmTraceability farm = null;
        MarketplaceTraceabilityResponse.PlotTraceability plot = null;
        MarketplaceTraceabilityResponse.SeasonTraceability season = null;
        MarketplaceTraceabilityResponse.HarvestTraceability harvest = null;
        MarketplaceTraceabilityResponse.ProductLotTraceability productLot = null;

        if (product != null) {
            productId = product.getId();
            traceable = product.getTraceable();

            if (product.getFarmId() != null) {
                farm = new MarketplaceTraceabilityResponse.FarmTraceability(
                        product.getFarmId(),
                        product.getFarmName(),
                        product.getFarmRegion(),
                        null, // address
                        null  // certification
                );
            }

            if (product.getSeasonId() != null) {
                season = new MarketplaceTraceabilityResponse.SeasonTraceability(
                        product.getSeasonId(),
                        product.getSeasonName(),
                        product.getCropName(),
                        null, // varietyName
                        null, // plantingDate
                        null  // harvestDate
                );
            }

            if (product.getLotId() != null) {
                productLot = new MarketplaceTraceabilityResponse.ProductLotTraceability(
                        product.getLotId(),
                        product.getLotCode(),
                        product.getLotHarvestDate() != null ? product.getLotHarvestDate().toLocalDate() : null,
                        product.getLotReceivedAt(),
                        null, // unit
                        product.getLotInitialQuantity(),
                        product.getLotGrade(),
                        product.getLotWarehouseName(),
                        product.getLotStorageLocation()
                );
            }

            if (product.getPlotId() != null) {
                plot = new MarketplaceTraceabilityResponse.PlotTraceability(
                        product.getPlotId(),
                        product.getPlotName(),
                        product.getPlotArea()
                );
            }
        } else if (orderItem != null) {
            productId = orderItem.getProductId();
            traceable = orderItem.getTraceableSnapshot();

            if (orderItem.getFarmId() != null) {
                farm = new MarketplaceTraceabilityResponse.FarmTraceability(
                        orderItem.getFarmId(),
                        orderItem.getFarmName(),
                        null, // region
                        null, // address
                        null  // certification
                );
            }

            if (orderItem.getSeasonId() != null) {
                season = new MarketplaceTraceabilityResponse.SeasonTraceability(
                        orderItem.getSeasonId(),
                        orderItem.getSeasonName(),
                        orderItem.getCropName(),
                        null, // varietyName
                        null, // plantingDate
                        null  // harvestDate
                );
            }

            if (orderItem.getLotId() != null) {
                productLot = new MarketplaceTraceabilityResponse.ProductLotTraceability(
                        orderItem.getLotId(),
                        orderItem.getLotCode(),
                        orderItem.getLotHarvestDate() != null ? orderItem.getLotHarvestDate().toLocalDate() : null,
                        orderItem.getLotReceivedAt(),
                        null, // unit
                        orderItem.getLotInitialQuantity(),
                        orderItem.getLotGrade(),
                        orderItem.getLotWarehouseName(),
                        orderItem.getLotStorageLocation()
                );
            }

            if (orderItem.getPlotId() != null) {
                plot = new MarketplaceTraceabilityResponse.PlotTraceability(
                        orderItem.getPlotId(),
                        orderItem.getPlotName(),
                        orderItem.getPlotArea()
                );
            }
        } else {
            throw new IllegalArgumentException("Either product or orderItem must be provided");
        }

        // Build timeline milestones
        List<MarketplaceTraceabilityResponse.TimelineMilestone> timeline = buildTimeline(product, orderItem);

        return new MarketplaceTraceabilityResponse(
                productId,
                traceable,
                farm,
                plot,
                season,
                harvest,
                productLot,
                timeline,
                LocalDateTime.now(),
                null,
                null,
                null
        );
    }

    private List<MarketplaceTraceabilityResponse.TimelineMilestone> buildTimeline(MarketplaceProduct product, MarketplaceOrderItem orderItem) {
        List<MarketplaceTraceabilityResponse.TimelineMilestone> milestones = new ArrayList<>();

        LocalDateTime now = LocalDateTime.now();

        // Add milestones based on available data
        if (product != null && product.getPublishedAt() != null) {
            milestones.add(new MarketplaceTraceabilityResponse.TimelineMilestone(
                    "PRODUCT_LISTED",
                    product.getPublishedAt(),
                    "Product listed on marketplace"
            ));
        }

        if (orderItem != null && orderItem.getCreatedAt() != null) {
            milestones.add(new MarketplaceTraceabilityResponse.TimelineMilestone(
                    "ORDER_PLACED",
                    orderItem.getCreatedAt(),
                    "Order placed by buyer"
            ));
        }

        if (orderItem != null && orderItem.getLotReceivedAt() != null) {
            milestones.add(new MarketplaceTraceabilityResponse.TimelineMilestone(
                    "LOT_RECEIVED",
                    orderItem.getLotReceivedAt(),
                    "Product lot received at warehouse"
            ));
        }

        // Sort timeline chronologically
        milestones.sort(Comparator.comparing(MarketplaceTraceabilityResponse.TimelineMilestone::date));

        return milestones;
    }
}
