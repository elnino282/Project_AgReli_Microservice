package org.example.delivery.repository;

import org.example.delivery.entity.DeliveryOrder;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface DeliveryOrderRepository extends JpaRepository<DeliveryOrder, Integer> {
    List<DeliveryOrder> findByMarketplaceOrderId(Long marketplaceOrderId);
    List<DeliveryOrder> findByBuyerUserId(Long buyerUserId);
    List<DeliveryOrder> findByMarketplaceOrderIdAndBuyerUserId(Long marketplaceOrderId, Long buyerUserId);
    long countByRequestedDeliveryDateAndDeliveryZoneTo(java.time.LocalDate date, String zone);
}
