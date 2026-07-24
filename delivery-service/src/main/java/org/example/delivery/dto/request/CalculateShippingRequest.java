package org.example.delivery.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;

public record CalculateShippingRequest(
    @NotBlank(message = "Sender province is required")
    String senderProvince,

    @NotBlank(message = "Recipient province is required")
    String recipientProvince,

    @NotNull(message = "Weight in kg is required")
    BigDecimal weightKg,

    boolean requiresColdChain,
    boolean prefersSameDay,
    
    // Tọa độ để tính khoảng cách (Optional)
    Double senderLat,
    Double senderLon,
    Double recipientLat,
    Double recipientLon,
    
    // Giao hàng gom cuối tuần
    boolean isGroupedDelivery
) {}
