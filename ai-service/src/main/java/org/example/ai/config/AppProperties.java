package org.example.ai.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Component
@ConfigurationProperties(prefix = "app")
@Getter
@Setter
public class AppProperties {

    private Ai ai = new Ai();

    @Getter
    @Setter
    public static class Ai {
        private String baseUrl;
        private String apiKey;
        private String model;
        private String embeddingModel;
    }
}
