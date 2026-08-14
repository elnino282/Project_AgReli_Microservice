package org.example.marketplace.service;

import org.example.marketplace.client.FarmClient;
import org.example.marketplace.client.IdentityClient;
import org.example.marketplace.client.InventoryClient;
import org.example.marketplace.client.SeasonClient;
import org.example.marketplace.dto.client.FarmSummaryDto;
import org.example.marketplace.dto.client.SeasonDetailDto;
import org.example.marketplace.dto.response.*;
import org.example.marketplace.dto.request.MarketplaceUpdateProductStatusRequest;
import org.example.marketplace.entity.MarketplaceProduct;
import org.example.marketplace.model.MarketplaceProductStatus;
import org.example.marketplace.repository.MarketplaceProductRepository;
import org.example.marketplace.shared.security.CurrentUserService;
import org.example.marketplace.event.DomainEventPublisher;
import org.example.marketplace.event.MarketplaceProductChangedEvent;
import org.example.marketplace.dto.request.MarketplaceFarmerProductUpsertRequest;
import org.example.marketplace.repository.MarketplaceOrderRepository;
import org.example.marketplace.entity.MarketplaceOrder;
import org.example.marketplace.model.MarketplacePaymentVerificationStatus;
import org.example.marketplace.exception.ConflictException;
import org.example.marketplace.exception.ResourceNotFoundException;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.mock.web.MockMultipartFile;
import java.util.Optional;
import static org.junit.jupiter.api.Assertions.assertThrows;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.example.marketplace.repository.MarketplaceOrderItemRepository;
import org.mockito.ArgumentCaptor;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.never;
import static org.mockito.ArgumentMatchers.any;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("MarketplaceServiceImpl Tests")
class MarketplaceServiceImplTest {

    @Mock
    private MarketplaceProductRepository marketplaceProductRepository;
    @Mock
    private FarmClient farmClient;
    @Mock
    private SeasonClient seasonClient;
    @Mock
    private InventoryClient inventoryClient;
    @Mock
    private IdentityClient identityClient;
    @Mock
    private CurrentUserService currentUserService;
    @Mock
    private DomainEventPublisher domainEventPublisher;
    @Mock
    private MarketplaceOrderRepository marketplaceOrderRepository;
    @Mock
    private MarketplaceOrderItemRepository marketplaceOrderItemRepository;
    @Mock
    private MarketplaceStorageService storageService;
    @Mock
    private MarketplaceComplianceGateService complianceGateService;

    @InjectMocks
    private MarketplaceServiceImpl marketplaceService;

    @Test
    @DisplayName("Public product lookup does not expose a draft by slug")
    void getProductBySlug_shouldNotExposeDraftProduct() {
        when(marketplaceProductRepository.findBySlugAndStatusIn(
                "draft-product", MarketplaceServiceImpl.PUBLIC_PRODUCT_STATUSES))
                .thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class,
                () -> marketplaceService.getProductBySlug("draft-product"));
    }

    @Test
    @DisplayName("Public trace does not expose a draft by id")
    void getPublicTraceability_shouldNotExposeDraftProduct() {
        when(marketplaceProductRepository.findByIdAndStatusIn(
                42L, MarketplaceServiceImpl.PUBLIC_PRODUCT_STATUSES))
                .thenReturn(Optional.empty());
        when(marketplaceProductRepository.findBySlugAndStatusIn(
                "42", MarketplaceServiceImpl.PUBLIC_PRODUCT_STATUSES))
                .thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class,
                () -> marketplaceService.getPublicTraceability("42"));
    }

    @Test
    @DisplayName("Farmer cannot move a draft product directly to a sellable status")
    void updateFarmerProductStatus_shouldRejectDirectPublish() {
        Long userId = 1L;
        MarketplaceProduct product = MarketplaceProduct.builder()
                .id(99L)
                .farmerUserId(userId)
                .status(MarketplaceProductStatus.DRAFT)
                .build();
        when(currentUserService.getCurrentUserId()).thenReturn(userId);
        when(marketplaceProductRepository.findByIdAndFarmerUserId(99L, userId))
                .thenReturn(Optional.of(product));

        assertThrows(ConflictException.class, () -> marketplaceService.updateFarmerProductStatus(
                99L,
                new MarketplaceUpdateProductStatusRequest(MarketplaceProductStatus.ACTIVE, null)));

        verify(marketplaceProductRepository, never()).save(any());
    }

    @Test
    @DisplayName("Admin approval to ACTIVE must pass the compliance gate")
    void updateAdminProductStatus_activeShouldRunComplianceGate() {
        MarketplaceProduct product = MarketplaceProduct.builder()
                .id(100L)
                .status(MarketplaceProductStatus.PENDING_REVIEW)
                .build();
        ComplianceCheckResponse compliance = new ComplianceCheckResponse(
                true,
                List.of(),
                "VERIFIED",
                "{\"certificate\":true}",
                "{\"phi\":true}");
        when(marketplaceProductRepository.findById(100L)).thenReturn(Optional.of(product));
        when(complianceGateService.checkCompliance(product)).thenReturn(compliance);
        when(currentUserService.getCurrentUserId()).thenReturn(2L);
        when(marketplaceProductRepository.save(any(MarketplaceProduct.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        marketplaceService.updateAdminProductStatus(
                100L,
                new MarketplaceUpdateProductStatusRequest(MarketplaceProductStatus.ACTIVE, null));

        verify(complianceGateService).checkCompliance(product);
        assertThat(product.getCertificationSnapshotJson()).isEqualTo("{\"certificate\":true}");
        assertThat(product.getHarvestSafetySnapshotJson()).isEqualTo("{\"phi\":true}");
        assertThat(product.getComplianceCheckedAt()).isNotNull();
    }

    @Test
    @DisplayName("Admin sellable transitions must not persist when compliance is unavailable")
    void updateAdminProductStatus_sellableShouldNotPersistWhenComplianceFails() {
        for (MarketplaceProductStatus requestedStatus : List.of(
                MarketplaceProductStatus.ACTIVE, MarketplaceProductStatus.PUBLISHED)) {
            MarketplaceProduct product = MarketplaceProduct.builder()
                    .id(101L)
                    .status(MarketplaceProductStatus.PENDING_REVIEW)
                    .build();
            ComplianceCheckResponse rejected = new ComplianceCheckResponse(
                    false,
                    List.of("Không thể xác minh dữ liệu an toàn thu hoạch với season-service."),
                    "NONE",
                    null,
                    null);
            when(marketplaceProductRepository.findById(101L)).thenReturn(Optional.of(product));
            when(complianceGateService.checkCompliance(product)).thenReturn(rejected);

            assertThrows(ConflictException.class, () -> marketplaceService.updateAdminProductStatus(
                    101L,
                    new MarketplaceUpdateProductStatusRequest(requestedStatus, null)));

            assertThat(product.getStatus()).isEqualTo(MarketplaceProductStatus.PENDING_REVIEW);
            assertThat(product.getHarvestSafetySnapshotJson()).isNull();
        }

        verify(marketplaceProductRepository, never()).save(any());
        verify(domainEventPublisher, never()).publish(any());
    }

    @Test
    @DisplayName("Should successfully retrieve farmer product form options")
    void getFarmerProductFormOptions_shouldReturnMappedOptions() {
        // Given
        Long userId = 1L;
        when(currentUserService.getCurrentUserId()).thenReturn(userId);

        when(farmClient.getFarmIdsByUserId(userId)).thenReturn(List.of(10));
        when(farmClient.getFarmsByIds(List.of(10))).thenReturn(List.of(new FarmSummaryDto(10, "Happy Farm", null, null, null)));

        when(seasonClient.getSeasonIdsByOwnerId(userId)).thenReturn(List.of(100));
        when(seasonClient.getSeasonsByIds(List.of(100))).thenReturn(List.of(new SeasonDetailDto(100, "Spring 2026", null, null, null, null, 10)));

        when(inventoryClient.getLotsBySeasonIds(List.of(100))).thenReturn(List.of(
                new InventoryClient.LotDetailDto(
                        500,
                        "LOT-500",
                        10,
                        100,
                        "Carrot",
                        "Premium",
                        "kg",
                        BigDecimal.TEN,
                        BigDecimal.TEN,
                        "AVAILABLE",
                        "Happy Farm",
                        "Spring 2026",
                        20,
                        "Plot A",
                        30,
                        "Main Warehouse",
                        "Zone A",
                        null,
                        null,
                        "A",
                        "GOOD")
        ));

        MarketplaceProduct linkedProduct = new MarketplaceProduct();
        linkedProduct.setId(888L);
        linkedProduct.setLotId(500);
        linkedProduct.setStatus(MarketplaceProductStatus.PUBLISHED);
        when(marketplaceProductRepository.findByLotIdIn(List.of(500))).thenReturn(List.of(linkedProduct));

        // When
        MarketplaceFarmerProductFormOptionsResponse response = marketplaceService.getFarmerProductFormOptions();

        // Then
        assertThat(response).isNotNull();
        assertThat(response.farms()).hasSize(1);
        assertThat(response.farms().get(0).name()).isEqualTo("Happy Farm");

        assertThat(response.seasons()).hasSize(1);
        assertThat(response.seasons().get(0).seasonName()).isEqualTo("Spring 2026");

        assertThat(response.lots()).hasSize(1);
        MarketplaceFarmerProductFormLotOptionResponse lotOpt = response.lots().get(0);
        assertThat(lotOpt.lotCode()).isEqualTo("LOT-500");
        assertThat(lotOpt.linkedProductId()).isEqualTo(888L);
        assertThat(lotOpt.linkedProductStatus()).isEqualTo(MarketplaceProductStatus.PUBLISHED);
        assertThat(lotOpt.farmName()).isEqualTo("Happy Farm");
        assertThat(lotOpt.seasonName()).isEqualTo("Spring 2026");
    }

    @Test
    @DisplayName("Should publish MarketplaceProductChangedEvent on product creation")
    void createFarmerProduct_shouldPublishMarketplaceProductChangedEvent() {
        // Given
        Long userId = 1L;
        when(currentUserService.getCurrentUserId()).thenReturn(userId);

        MarketplaceFarmerProductUpsertRequest request = new MarketplaceFarmerProductUpsertRequest(
                "Fresh Lettuce",
                "VEGETABLE",
                "Crisp green lettuce",
                "Locally grown organic lettuce",
                BigDecimal.valueOf(15000),
                BigDecimal.valueOf(100),
                BigDecimal.ONE,
                true,
                false,
                "http://example.com/lettuce.png",
                List.of(),
                1001
        );

        MarketplaceProduct savedProduct = MarketplaceProduct.builder()
                .id(999L)
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
                .build();

        when(marketplaceProductRepository.save(any(MarketplaceProduct.class))).thenReturn(savedProduct);

        // When
        MarketplaceProductDetailResponse response = marketplaceService.createFarmerProduct(request);

        // Then
        assertThat(response).isNotNull();
        assertThat(response.id()).isEqualTo(999L);
        assertThat(response.name()).isEqualTo("Fresh Lettuce");

        ArgumentCaptor<MarketplaceProductChangedEvent> eventCaptor = ArgumentCaptor.forClass(MarketplaceProductChangedEvent.class);
        verify(domainEventPublisher).publish(eventCaptor.capture());

        MarketplaceProductChangedEvent capturedEvent = eventCaptor.getValue();
        assertThat(capturedEvent).isNotNull();
        assertThat(capturedEvent.payload().productId()).isEqualTo(999L);
        assertThat(capturedEvent.payload().productName()).isEqualTo("Fresh Lettuce");
        assertThat(capturedEvent.payload().farmerId()).isEqualTo(1L);
        assertThat(capturedEvent.payload().status()).isEqualTo("DRAFT");
    }

    @Test
    @DisplayName("Should successfully upload payment proof and set SUBMITTED status")
    void uploadPaymentProof_shouldSetSubmittedStatus() {
        // Given
        Long userId = 1L;
        Long orderId = 100L;
        when(currentUserService.getCurrentUserId()).thenReturn(userId);

        MarketplaceOrder order = new MarketplaceOrder();
        order.setId(orderId);
        order.setBuyerUserId(userId);
        order.setPaymentVerificationStatus(MarketplacePaymentVerificationStatus.AWAITING_PROOF);

        when(marketplaceOrderRepository.findByIdAndBuyerUserId(orderId, userId)).thenReturn(Optional.of(order));
        when(marketplaceOrderItemRepository.findByOrderId(orderId)).thenReturn(List.of());
        
        MockMultipartFile file = new MockMultipartFile("file", "proof.jpg", "image/jpeg", "image data".getBytes());
        when(storageService.storePaymentProof(file, orderId, userId)).thenReturn("http://minio/proof.jpg");
        when(marketplaceOrderRepository.save(any(MarketplaceOrder.class))).thenAnswer(i -> i.getArgument(0));

        // When
        MarketplaceOrderResponse response = marketplaceService.uploadPaymentProof(orderId, file);

        // Then
        assertThat(order.getPaymentVerificationStatus()).isEqualTo(MarketplacePaymentVerificationStatus.SUBMITTED);
        assertThat(order.getPaymentProofFileName()).isEqualTo("proof.jpg");
        assertThat(order.getPaymentProofStoragePath()).isEqualTo("http://minio/proof.jpg");
        assertThat(order.getPaymentProofUploadedAt()).isNotNull();
        
        verify(domainEventPublisher).publish(any());
    }

    @Test
    @DisplayName("Should not set SUBMITTED status if NOT_REQUIRED")
    void uploadPaymentProof_shouldNotSetSubmittedIfNotRequired() {
        // Given
        Long userId = 1L;
        Long orderId = 100L;
        when(currentUserService.getCurrentUserId()).thenReturn(userId);

        MarketplaceOrder order = new MarketplaceOrder();
        order.setId(orderId);
        order.setBuyerUserId(userId);
        order.setPaymentVerificationStatus(MarketplacePaymentVerificationStatus.NOT_REQUIRED);

        when(marketplaceOrderRepository.findByIdAndBuyerUserId(orderId, userId)).thenReturn(Optional.of(order));
        when(marketplaceOrderItemRepository.findByOrderId(orderId)).thenReturn(List.of());
        
        MockMultipartFile file = new MockMultipartFile("file", "proof.jpg", "image/jpeg", "image data".getBytes());
        when(storageService.storePaymentProof(file, orderId, userId)).thenReturn("http://minio/proof.jpg");
        when(marketplaceOrderRepository.save(any(MarketplaceOrder.class))).thenAnswer(i -> i.getArgument(0));

        // When
        MarketplaceOrderResponse response = marketplaceService.uploadPaymentProof(orderId, file);

        // Then
        assertThat(order.getPaymentVerificationStatus()).isEqualTo(MarketplacePaymentVerificationStatus.NOT_REQUIRED);
        assertThat(order.getPaymentProofStoragePath()).isEqualTo("http://minio/proof.jpg");
    }

    @Test
    @DisplayName("Should throw ConflictException if VERIFIED")
    void uploadPaymentProof_shouldThrowConflictIfVerified() {
        // Given
        Long userId = 1L;
        Long orderId = 100L;
        when(currentUserService.getCurrentUserId()).thenReturn(userId);

        MarketplaceOrder order = new MarketplaceOrder();
        order.setId(orderId);
        order.setBuyerUserId(userId);
        order.setPaymentVerificationStatus(MarketplacePaymentVerificationStatus.VERIFIED);

        when(marketplaceOrderRepository.findByIdAndBuyerUserId(orderId, userId)).thenReturn(Optional.of(order));
        
        MockMultipartFile file = new MockMultipartFile("file", "proof.jpg", "image/jpeg", "image data".getBytes());

        // When/Then
        assertThrows(ConflictException.class, () -> marketplaceService.uploadPaymentProof(orderId, file));
    }

    @Test
    @DisplayName("Should return SUBMITTED orders for admin list")
    void listAdminPaymentProofs_shouldReturnSubmittedOrders() {
        // Given
        int page = 0;
        int size = 10;
        MarketplaceOrder order = new MarketplaceOrder();
        order.setId(200L);
        order.setPaymentVerificationStatus(MarketplacePaymentVerificationStatus.SUBMITTED);
        
        Page<MarketplaceOrder> orderPage = new PageImpl<>(List.of(order));
        when(marketplaceOrderRepository.findByPaymentVerificationStatus(
                MarketplacePaymentVerificationStatus.SUBMITTED, PageRequest.of(page, size)))
                .thenReturn(orderPage);

        // When
        org.example.DTO.Common.PageResponse<MarketplacePaymentProofResponse> response = 
                marketplaceService.listAdminPaymentProofs(page, size);

        // Then
        assertThat(response.items()).hasSize(1);
        assertThat(response.items().get(0).orderId()).isEqualTo(200L);
    }
}
