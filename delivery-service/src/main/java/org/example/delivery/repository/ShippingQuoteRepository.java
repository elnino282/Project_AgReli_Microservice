package org.example.delivery.repository;

import jakarta.persistence.LockModeType;
import java.util.Optional;
import org.example.delivery.entity.ShippingQuote;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;

public interface ShippingQuoteRepository extends JpaRepository<ShippingQuote, String> {
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<ShippingQuote> findForUpdateByQuoteId(String quoteId);
}
