package org.example.ai.dto.request;

import java.util.List;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.FieldDefaults;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class InternalDiseaseSuggestionRequest {
    String cropName;
    String diseaseName;
    String severity;
    String notes;
    List<String> availableSupplies;
    String additionalNote;
    String question;
}
