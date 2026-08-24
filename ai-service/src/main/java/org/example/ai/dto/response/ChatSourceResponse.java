package org.example.ai.dto.response;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class ChatSourceResponse {

    @JsonProperty("file_name")
    private final String fileName;
    private final String heading;
    private final Integer page;
    private final String snippet;
}
