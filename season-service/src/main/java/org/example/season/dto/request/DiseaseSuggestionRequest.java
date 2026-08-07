package org.example.season.dto.request;

import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.FieldDefaults;
import jakarta.validation.constraints.Size;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class DiseaseSuggestionRequest {
    
    @Size(max = 2000)
    String question;
    
    Boolean includeInventory;
    
    @Size(max = 4000)
    String additionalNote;
}
