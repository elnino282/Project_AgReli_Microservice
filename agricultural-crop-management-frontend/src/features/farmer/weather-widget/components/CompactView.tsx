import React from "react";
import { MapPin, Droplets, CloudRain, ExternalLink } from "lucide-react";
import { Card, CardContent } from "@/shared/ui/card";
import { useI18n } from "@/shared/lib/hooks/useI18n";
import type { WeatherData, WeatherWidgetDataState } from "../types";

interface CompactViewProps extends React.HTMLAttributes<HTMLDivElement> {
  weatherData: WeatherData | null;
  location: string | null;
  uiState: WeatherWidgetDataState;
  statusMessage: string | null;
}

/**
 * Compact Weather Display Component
 * Minimal card view showing essential weather information
 * Uses forwardRef to support PopoverTrigger asChild pattern
 */
export const CompactView = React.forwardRef<HTMLDivElement, CompactViewProps>(
  ({ weatherData, location, uiState, statusMessage, ...props }, ref) => {
    const { t } = useI18n();

    const surfaceStyle = {
      background:
        "linear-gradient(to bottom right, color-mix(in oklab, var(--secondary) 5%, transparent), var(--card), color-mix(in oklab, var(--accent) 5%, transparent))",
    } as const;

    let placeholder = t("weatherWidget.compact.placeholder.default", "Click to view weather");
    if (uiState === "loading") {
      placeholder = t("weatherWidget.compact.placeholder.loading", "Loading weather...");
    }
    if (uiState === "location_required") {
      placeholder = t("weatherWidget.compact.placeholder.locationRequired", "Update farm location");
    }
    if (uiState === "weather_unavailable") {
      placeholder = t("weatherWidget.compact.placeholder.unavailable", "Weather unavailable");
    }
    if (uiState === "error") {
      placeholder =
        statusMessage ||
        t("weatherWidget.compact.placeholder.error", "Unable to load weather");
    }

    if (!weatherData) {
      return (
        <Card
          ref={ref}
          {...props}
          className="w-60 border-border rounded-2xl shadow-sm cursor-pointer hover:shadow-md transition-all"
          style={surfaceStyle}
        >
          <CardContent className="p-3.5">
            <div className="text-center text-muted-foreground text-sm">{placeholder}</div>
          </CardContent>
        </Card>
      );
    }

    const WeatherIcon = weatherData.icon;

    return (
      <Card
        ref={ref}
        {...props}
        className="w-60 border-border rounded-2xl shadow-sm cursor-pointer hover:shadow-md hover:scale-[1.02] transition-all group"
        style={surfaceStyle}
      >
        <CardContent className="p-3.5">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2.5">
              <div className="relative">
                <div
                  className="absolute inset-0 rounded-full blur-lg"
                  style={{
                    backgroundColor:
                      "color-mix(in oklab, var(--accent) 20%, transparent)",
                  }}
                />
                <div
                  className="relative p-2 rounded-xl"
                  style={{
                    background:
                      "linear-gradient(to bottom right, var(--accent), color-mix(in oklab, var(--accent) 70%, transparent))",
                  }}
                >
                  <WeatherIcon className="w-5 h-5 text-white" />
                </div>
              </div>
              <div>
                <div className="flex items-baseline gap-1">
                  <span className="numeric text-xl text-foreground">
                    {weatherData.temperature}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {t("weatherWidget.compact.temperatureUnit", "degC")}
                  </span>
                </div>
                <div className="text-[0.65rem] text-secondary">
                  {weatherData.condition}
                </div>
              </div>
            </div>

            <ExternalLink className="w-3.5 h-3.5 text-muted-foreground group-hover:text-secondary transition-colors" />
          </div>

          <div className="flex items-center justify-between text-[0.65rem] pt-2 border-t border-border">
            <div className="flex items-center gap-1 text-muted-foreground">
              <MapPin className="w-3 h-3" />
              <span className="truncate max-w-[100px]">
                {location || t("weatherWidget.compact.locationFallback", "Unknown location")}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                <Droplets className="w-3 h-3 text-secondary" />
                <span className="numeric text-muted-foreground">
                  {weatherData.humidity}%
                </span>
              </div>
              <div className="flex items-center gap-1">
                <CloudRain className="w-3 h-3 text-primary" />
                <span className="numeric text-muted-foreground">
                  {weatherData.precipitation}%
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }
);

CompactView.displayName = "CompactView";
