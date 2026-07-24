import React, { useCallback, useMemo } from "react";
import { CardContent } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { useI18n } from "@/shared/lib/hooks/useI18n";
import { LocationHeader } from "./LocationHeader";
import { ForecastBar } from "./ForecastBar";
import { CurrentWeather } from "./CurrentWeather";
import { AgriAlerts } from "./AgriAlerts";
import { FieldConditions } from "./FieldConditions";
import { WeatherDetails } from "./WeatherDetails";
import { AdditionalInfo } from "./AdditionalInfo";
import { FarmingRecommendation } from "./FarmingRecommendation";
import { LoadingSkeleton } from "./LoadingSkeleton";
import type { UseWeatherWidgetReturn } from "../types";

type DetailedViewProps = UseWeatherWidgetReturn;
type Translator = (key: string, optionsOrDefault?: Record<string, unknown> | string) => string;

function resolveStateContent(
  uiState: UseWeatherWidgetReturn["uiState"],
  statusMessage: string | null,
  error: string | null,
  t: Translator
) {
  if (uiState === "location_required") {
    return {
      title: t(
        "weatherWidget.detailed.state.locationRequired.title",
        "Farm location is required"
      ),
      description:
        statusMessage ||
        t(
          "weatherWidget.detailed.state.locationRequired.description",
          "Please update latitude and longitude in your farm settings to view weather."
        ),
    };
  }

  if (uiState === "weather_unavailable") {
    return {
      title: t(
        "weatherWidget.detailed.state.unavailable.title",
        "Weather service unavailable"
      ),
      description:
        statusMessage ||
        t(
          "weatherWidget.detailed.state.unavailable.description",
          "Weather data is temporarily unavailable. Please try again."
        ),
    };
  }

  if (uiState === "error") {
    return {
      title: t("weatherWidget.detailed.state.error.title", "Failed to load weather"),
      description:
        error ||
        statusMessage ||
        t(
          "weatherWidget.detailed.state.error.description",
          "Please refresh and try again."
        ),
    };
  }

  return {
    title: t("weatherWidget.detailed.state.empty.title", "No weather data"),
    description: t(
      "weatherWidget.detailed.state.empty.description",
      "Refresh to load latest weather for your farm."
    ),
  };
}

export const DetailedView = React.memo<DetailedViewProps>((props) => {
  const { t } = useI18n();
  const {
    weatherData,
    forecast,
    agriAlerts,
    location,
    isEditingLocation,
    tempLocation,
    isLoading,
    error,
    uiState,
    statusMessage,
    locationSuggestions,
    isSearchingLocations,
    setTempLocation,
    setIsEditingLocation,
    handleSaveLocation,
    handleCancelLocation,
    handleRefresh,
    setError,
    getUVIndexColor,
    getUVIndexLabel,
    getSprayConditions,
    clearLocationSuggestions,
    getAlertIcon,
    getAlertColor,
  } = props;

  const handleTempLocationChange = useCallback(
    (value: string) => setTempLocation(value),
    [setTempLocation]
  );

  const handleErrorClear = useCallback(() => setError(null), [setError]);

  const sprayConditions = useMemo(() => getSprayConditions(), [getSprayConditions]);
  const stateContent = resolveStateContent(uiState, statusMessage, error, t);

  return (
    <CardContent className="p-0">
      <LocationHeader
        location={location}
        isEditingLocation={isEditingLocation}
        tempLocation={tempLocation}
        isLoading={isLoading}
        error={error}
        lastUpdated={weatherData?.lastUpdated || t("weatherWidget.detailed.notLoaded", "Not loaded")}
        locationSuggestions={locationSuggestions}
        isSearchingLocations={isSearchingLocations}
        onTempLocationChange={handleTempLocationChange}
        onSetEditingLocation={setIsEditingLocation}
        onSaveLocation={handleSaveLocation}
        onCancelLocation={handleCancelLocation}
        onRefresh={handleRefresh}
        onErrorClear={handleErrorClear}
        onClearSuggestions={clearLocationSuggestions}
      />

      {isLoading ? (
        <LoadingSkeleton />
      ) : weatherData ? (
        <>
          <ForecastBar forecast={forecast} />
          <div className="p-5">
            <CurrentWeather weatherData={weatherData} />
            <AgriAlerts
              agriAlerts={agriAlerts}
              getAlertIcon={getAlertIcon}
              getAlertColor={getAlertColor}
            />
            <FieldConditions sprayConditions={sprayConditions} />
            <WeatherDetails
              weatherData={weatherData}
              getUVIndexColor={getUVIndexColor}
              getUVIndexLabel={getUVIndexLabel}
            />
            <AdditionalInfo weatherData={weatherData} />
            <FarmingRecommendation />
          </div>
        </>
      ) : (
        <div className="p-6 text-center space-y-3">
          <p className="text-sm text-muted-foreground font-medium">{stateContent.title}</p>
          <p className="text-xs text-muted-foreground">{stateContent.description}</p>
          {uiState === "location_required" && (
            <Button size="sm" variant="outline" asChild>
              <a href="/farmer/farms">
                {t("weatherWidget.detailed.actions.updateFarmLocation", "Update Farm Location")}
              </a>
            </Button>
          )}
        </div>
      )}
    </CardContent>
  );
});

DetailedView.displayName = "DetailedView";
