package org.example.ai.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.util.List;

public class PredictHarvestRequest {

    @NotBlank
    private String cropName;

    @NotBlank
    private String plantingDate;

    @NotNull
    private Integer expectedGrowthDays;

    private List<FarmingLogDto> recentLogs;

    public static class FarmingLogDto {
        private String date;
        private String activityType; // "FERTILIZER", "PESTICIDE"
        private String materialName;
        private Integer phiDays; // Pre-harvest interval

        public String getDate() { return date; }
        public void setDate(String date) { this.date = date; }

        public String getActivityType() { return activityType; }
        public void setActivityType(String activityType) { this.activityType = activityType; }

        public String getMaterialName() { return materialName; }
        public void setMaterialName(String materialName) { this.materialName = materialName; }

        public Integer getPhiDays() { return phiDays; }
        public void setPhiDays(Integer phiDays) { this.phiDays = phiDays; }
    }

    public String getCropName() { return cropName; }
    public void setCropName(String cropName) { this.cropName = cropName; }

    public String getPlantingDate() { return plantingDate; }
    public void setPlantingDate(String plantingDate) { this.plantingDate = plantingDate; }

    public Integer getExpectedGrowthDays() { return expectedGrowthDays; }
    public void setExpectedGrowthDays(Integer expectedGrowthDays) { this.expectedGrowthDays = expectedGrowthDays; }

    public List<FarmingLogDto> getRecentLogs() { return recentLogs; }
    public void setRecentLogs(List<FarmingLogDto> recentLogs) { this.recentLogs = recentLogs; }
}
