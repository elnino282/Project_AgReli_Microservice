import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import { useDocumentsMeta } from "@/entities/document";
import { useI18n } from "@/shared/lib/hooks/useI18n";
import { Search, X } from "lucide-react";
import type {
  DocumentFiltersState,
  DocumentSortOption,
} from "../hooks/useDocumentFilters";

// Type chip options
const TYPE_CHIPS = [
  { value: "", labelKey: "documents.filters.type.all" },
  { value: "GUIDE", labelKey: "documents.filters.type.guides" },
  { value: "TEMPLATE", labelKey: "documents.filters.type.templates" },
  { value: "ANNOUNCEMENT", labelKey: "documents.filters.type.announcements" },
  { value: "SYSTEM_HELP", labelKey: "documents.filters.type.systemHelp" },
] as const;

// Sort options
const SORT_OPTIONS = [
  { value: "NEWEST", labelKey: "documents.filters.sort.newest" },
  { value: "MOST_VIEWED", labelKey: "documents.filters.sort.mostViewed" },
  { value: "RECOMMENDED", labelKey: "documents.filters.sort.recommended" },
] as const;

// Fallback options if meta is not loaded
const DEFAULT_STAGES = [
  { value: "Planting", labelKey: "documents.filters.stageOptions.planting" },
  { value: "Growing", labelKey: "documents.filters.stageOptions.growing" },
  { value: "Harvest", labelKey: "documents.filters.stageOptions.harvest" },
  { value: "Post-Harvest", labelKey: "documents.filters.stageOptions.postHarvest" },
];
const DEFAULT_TOPICS = [
  { value: "Best Practices", labelKey: "documents.filters.topicOptions.bestPractices" },
  { value: "Pest Management", labelKey: "documents.filters.topicOptions.pestManagement" },
  { value: "Water Management", labelKey: "documents.filters.topicOptions.waterManagement" },
  { value: "Soil Management", labelKey: "documents.filters.topicOptions.soilManagement" },
  { value: "Farm Planning", labelKey: "documents.filters.topicOptions.farmPlanning" },
  { value: "Climate Adaptation", labelKey: "documents.filters.topicOptions.climateAdaptation" },
];

interface DocumentFilterBarProps {
  filters: DocumentFiltersState;
  onFilterChange: <K extends keyof DocumentFiltersState>(
    key: K,
    value: DocumentFiltersState[K],
  ) => void;
  onClearFilters: () => void;
  hasActiveFilters: boolean;
}

export function DocumentFilterBar({
  filters,
  onFilterChange,
  onClearFilters,
  hasActiveFilters,
}: DocumentFilterBarProps) {
  const { t } = useI18n();
  const { data: meta } = useDocumentsMeta();

  const stages = meta?.stages?.length
    ? meta.stages.map((stage) => ({ value: stage, label: stage }))
    : DEFAULT_STAGES.map((stage) => ({ value: stage.value, label: t(stage.labelKey) }));
  const topics = meta?.topics?.length
    ? meta.topics.map((topic) => ({ value: topic, label: topic }))
    : DEFAULT_TOPICS.map((topic) => ({ value: topic.value, label: t(topic.labelKey) }));
  const crops = meta?.crops ?? [];

  return (
    <div className="flex flex-wrap items-center gap-3 p-4 bg-card rounded-xl border border-border">
      {/* Search Input */}
      <div className="relative flex-1 min-w-[200px] max-w-[320px]">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder={t("documents.filters.searchPlaceholder")}
          value={filters.q}
          onChange={(e) => onFilterChange("q", e.target.value)}
          className="pl-10 rounded-lg border-border focus:border-primary"
        />
      </div>

      {/* Type Dropdown */}
      <Select
        value={filters.type || "all"}
        onValueChange={(value) =>
          onFilterChange("type", value === "all" ? undefined : value)
        }
      >
        <SelectTrigger className="w-[160px] rounded-lg border-border">
          <SelectValue placeholder={t("documents.filters.type.all")} />
        </SelectTrigger>
        <SelectContent>
          {TYPE_CHIPS.map((chip) => (
            <SelectItem key={chip.value || "all"} value={chip.value || "all"}>
              {t(chip.labelKey)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Crop Dropdown */}
      <Select
        value={filters.cropId || "all"}
        onValueChange={(value) =>
          onFilterChange("cropId", value === "all" ? undefined : value)
        }
      >
        <SelectTrigger className="w-[140px] rounded-lg border-border">
          <SelectValue placeholder={t("documents.filters.allCrops")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t("documents.filters.allCrops")}</SelectItem>
          {crops.map((crop) => (
            <SelectItem key={crop.id} value={String(crop.id)}>
              {crop.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Stage Dropdown */}
      <Select
        value={filters.stage || "all"}
        onValueChange={(value) =>
          onFilterChange("stage", value === "all" ? undefined : value)
        }
      >
        <SelectTrigger className="w-[130px] rounded-lg border-border">
          <SelectValue placeholder={t("documents.filters.allStages")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t("documents.filters.allStages")}</SelectItem>
          {stages.map((stage) => (
            <SelectItem key={stage.value} value={stage.value}>
              {stage.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Topic Dropdown */}
      <Select
        value={filters.topic || "all"}
        onValueChange={(value) =>
          onFilterChange("topic", value === "all" ? undefined : value)
        }
      >
        <SelectTrigger className="w-[150px] rounded-lg border-border">
          <SelectValue placeholder={t("documents.filters.allTopics")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t("documents.filters.allTopics")}</SelectItem>
          {topics.map((topic) => (
            <SelectItem key={topic.value} value={topic.value}>
              {topic.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Sort Dropdown */}
      <Select
        value={filters.sort}
        onValueChange={(value) =>
          onFilterChange("sort", value as DocumentSortOption)
        }
      >
        <SelectTrigger className="w-[140px] rounded-lg border-border">
          <SelectValue placeholder={t("documents.filters.sortBy")} />
        </SelectTrigger>
        <SelectContent>
          {SORT_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {t(option.labelKey)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Clear Filters Button */}
      {hasActiveFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onClearFilters}
          className="text-muted-foreground hover:text-foreground gap-1"
        >
          <X className="w-3 h-3" />
          {t("documents.filters.clearFilters")}
        </Button>
      )}
    </div>
  );
}
