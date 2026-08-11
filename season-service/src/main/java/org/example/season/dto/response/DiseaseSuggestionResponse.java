package org.example.season.dto.response;

import java.util.Map;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.FieldDefaults;
import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class DiseaseSuggestionResponse {
    
    Integer diseaseRecordId;
    
    String suggestionText;
    
    Map<String, Object> usedContextSummary;
    
    Instant generatedAt;
    
    String warning;

    Boolean matchedFromInventory;
    String matchedSupplyName;
    String recommendedProductName;
    String recommendedActiveIngredient;
    String summary;
    String safetyNotes;
    String usageInstructions;
}
