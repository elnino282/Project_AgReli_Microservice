import {
  useCreateDiseaseRecord,
  useCreateDiseaseTreatment,
  useDeleteDiseaseRecord,
  useDeleteDiseaseTreatment,
  useDiseaseAiSuggestion,
  useDiseaseRecordDetail,
  useDiseaseRecords,
  useDiseaseTreatments,
  useUpdateDiseaseRecord,
  useUpdateDiseaseTreatment,
  type DiseaseRecord,
  type DiseaseRecordCreateRequest,
  type DiseaseRecordUpdateRequest,
  type DiseaseStatus,
  type DiseaseSuggestionResponse,
  type DiseaseTreatment,
  type DiseaseTreatmentCreateRequest,
  type DiseaseTreatmentUpdateRequest,
} from "@/entities/disease";
import { useEmployeeAssignedSeasons } from "@/entities/field-log";
import { useSeasonById } from "@/entities/season";
import {
  useAllSupplyItems,
  useEmployeeSeasonSupplyItems,
  useEmployeeSeasonSupplyLots,
  useSupplyLots,
} from "@/entities/supplies";
import { useI18n } from "@/shared/lib/hooks/useI18n";
import { useOptionalSeason } from "@/shared/contexts";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AsyncState,
  Badge,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  PageContainer,
  PageHeader,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
  Textarea,
} from "@/shared/ui";
import {
  AlertCircle,
  Bug,
  ChevronDown,
  ChevronUp,
  FlaskConical,
  Loader2,
  Pencil,
  Plus,
  Search,
  ShieldAlert,
  Sparkles,
  Stethoscope,
  Trash2,
} from "lucide-react";
import { isAxiosError } from "axios";
import { useEffect, useMemo, useState } from "react";
import { useLocation, useParams } from "react-router-dom";
import { toast } from "sonner";

interface LocalizedOption {
  value: string;
  labelKey: string;
  fallbackLabel: string;
}

const DISEASE_SEVERITY_OPTIONS = [
  { value: "LOW", labelKey: "diseaseTracking.severityOptions.LOW", fallbackLabel: "Low" },
  { value: "MEDIUM", labelKey: "diseaseTracking.severityOptions.MEDIUM", fallbackLabel: "Medium" },
  { value: "HIGH", labelKey: "diseaseTracking.severityOptions.HIGH", fallbackLabel: "High" },
  { value: "CRITICAL", labelKey: "diseaseTracking.severityOptions.CRITICAL", fallbackLabel: "Critical" },
] satisfies LocalizedOption[];

const DISEASE_STATUS_OPTIONS = [
  { value: "OPEN", labelKey: "diseaseTracking.statusOptions.OPEN", fallbackLabel: "Newly detected" },
  {
    value: "UNDER_TREATMENT",
    labelKey: "diseaseTracking.statusOptions.UNDER_TREATMENT",
    fallbackLabel: "Under treatment",
  },
  { value: "MONITORING", labelKey: "diseaseTracking.statusOptions.MONITORING", fallbackLabel: "Monitoring" },
  { value: "RESOLVED", labelKey: "diseaseTracking.statusOptions.RESOLVED", fallbackLabel: "Stabilized" },
  { value: "CLOSED", labelKey: "diseaseTracking.statusOptions.CLOSED", fallbackLabel: "Closed record" },
] satisfies LocalizedOption[];

const TREATMENT_EFFECTIVENESS_OPTIONS = [
  {
    value: "UNKNOWN",
    labelKey: "diseaseTracking.effectivenessOptions.UNKNOWN",
    fallbackLabel: "Not evaluated",
  },
  { value: "POOR", labelKey: "diseaseTracking.effectivenessOptions.POOR", fallbackLabel: "Poor" },
  { value: "FAIR", labelKey: "diseaseTracking.effectivenessOptions.FAIR", fallbackLabel: "Fair" },
  { value: "GOOD", labelKey: "diseaseTracking.effectivenessOptions.GOOD", fallbackLabel: "Good" },
  {
    value: "EXCELLENT",
    labelKey: "diseaseTracking.effectivenessOptions.EXCELLENT",
    fallbackLabel: "Excellent",
  },
] satisfies LocalizedOption[];

interface DiseaseRecordFormState {
  diseaseName: string;
  symptomSummary: string;
  severity: string;
  status: string;
  detectedAt: string;
  affectedPlantCount: string;
  affectedAreaPercent: string;
  evidenceUrl: string;
  notes: string;
}

interface DiseaseTreatmentFormState {
  treatedAt: string;
  method: string;
  supplyItemId: string;
  supplyLotId: string;
  quantityUsed: string;
  unit: string;
  dosageNote: string;
  costAmount: string;
  resultNote: string;
  effectiveness: string;
}

const getCurrentDateTimeInput = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

const initialRecordFormState = (): DiseaseRecordFormState => ({
  diseaseName: "",
  symptomSummary: "",
  severity: "MEDIUM",
  status: "OPEN",
  detectedAt: getCurrentDateTimeInput(),
  affectedPlantCount: "",
  affectedAreaPercent: "",
  evidenceUrl: "",
  notes: "",
});

const initialTreatmentFormState = (): DiseaseTreatmentFormState => ({
  treatedAt: getCurrentDateTimeInput(),
  method: "",
  supplyItemId: "none",
  supplyLotId: "none",
  quantityUsed: "",
  unit: "",
  dosageNote: "",
  costAmount: "",
  resultNote: "",
  effectiveness: "UNKNOWN",
});

const toDateTimeInput = (value?: string | null) => {
  if (!value) return "";
  const directValue = value.replace(" ", "T");
  if (directValue.length >= 16) return directValue.slice(0, 16);
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const day = String(parsed.getDate()).padStart(2, "0");
  const hours = String(parsed.getHours()).padStart(2, "0");
  const minutes = String(parsed.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

const toApiDateTime = (value: string) => {
  if (!value) return value;
  return value.length === 16 ? `${value}:00` : value;
};

const formatDateTime = (value: string | null | undefined, locale: string) => {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString(locale);
};

const formatNumber = (value: number | null | undefined, locale: string, suffix?: string) => {
  if (value === null || value === undefined) return "-";
  return `${value.toLocaleString(locale)}${suffix ? ` ${suffix}` : ""}`;
};

const formatCurrencyVnd = (value: number | null | undefined, locale: string) => {
  if (value === null || value === undefined) return "-";
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value);
};

interface ParsedNumberInput {
  value: number | undefined;
  isInvalid: boolean;
}

const parseNonNegativeIntegerInput = (value: string): ParsedNumberInput => {
  const trimmed = value.trim();
  if (!trimmed) return { value: undefined, isInvalid: false };
  const numeric = Number(trimmed);
  if (!Number.isFinite(numeric) || !Number.isInteger(numeric) || numeric < 0) {
    return { value: undefined, isInvalid: true };
  }
  return { value: numeric, isInvalid: false };
};

const parseNonNegativeDecimalInput = (value: string): ParsedNumberInput => {
  const trimmed = value.trim().replace(",", ".");
  if (!trimmed) return { value: undefined, isInvalid: false };
  const numeric = Number(trimmed);
  if (!Number.isFinite(numeric) || numeric < 0) {
    return { value: undefined, isInvalid: true };
  }
  return { value: numeric, isInvalid: false };
};

const parseOptionalSelectId = (value: string) => {
  if (!value || value === "none") return undefined;
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) return undefined;
  return numeric;
};

const PERMISSION_ERROR_CODES = new Set(["ERR_FORBIDDEN", "ERR_UNAUTHORIZED", "ERR_UNAUTHENTICATED", "NOT_OWNER"]);
const VALIDATION_ERROR_CODES = new Set([
  "ERR_KEY_INVALID",
  "ERR_INVALID_DISEASE_SEVERITY",
  "ERR_INVALID_DISEASE_STATUS",
  "ERR_INVALID_TREATMENT_EFFECTIVENESS",
  "ERR_INVALID_DISEASE_DETECTED_AT",
  "ERR_INVALID_DISEASE_TREATED_AT",
  "ERR_DISEASE_REFERENCE_SEASON_MISMATCH",
  "ERR_DISEASE_SUPPLY_ITEM_LOT_MISMATCH",
]);

interface ApiErrorPayload {
  status?: number;
  code?: string;
  message?: string;
}

const extractApiErrorPayload = (error: unknown): ApiErrorPayload | null => {
  if (!isAxiosError(error)) return null;

  const rawData = error.response?.data;
  if (!rawData || typeof rawData !== "object") {
    return { status: error.response?.status };
  }

  const data = rawData as { status?: unknown; code?: unknown; message?: unknown };
  return {
    status:
      error.response?.status
      ?? (typeof data.status === "number" ? data.status : undefined),
    code: typeof data.code === "string" ? data.code : undefined,
    message: typeof data.message === "string" ? data.message : undefined,
  };
};

const toReadableError = (
  error: unknown,
  translate: (key: string, optionsOrDefault?: Record<string, unknown> | string) => string,
  fallbackKey: string,
  fallbackText: string,
) => {
  const payload = extractApiErrorPayload(error);
  const code = payload?.code;
  const status = payload?.status;

  if (status === 401 || code === "ERR_UNAUTHENTICATED" || code === "ERR_UNAUTHORIZED") {
    return translate("diseaseTracking.errors.sessionExpired");
  }

  if (status === 403 || (code && PERMISSION_ERROR_CODES.has(code))) {
    return translate("diseaseTracking.errors.permissionDenied");
  }

  if (status === 400 || (code && VALIDATION_ERROR_CODES.has(code))) {
    return payload?.message ?? translate("diseaseTracking.errors.invalidData");
  }

  if (payload?.message) return payload.message;
  if (error instanceof Error && error.message) return error.message;
  return translate(fallbackKey, fallbackText);
};

const getSeverityBadgeVariant = (severity: string) => {
  switch (severity) {
    case "CRITICAL":
    case "HIGH":
      return "destructive";
    case "MEDIUM":
      return "warning";
    case "LOW":
      return "success";
    default:
      return "outline";
  }
};

const getStatusBadgeVariant = (status: string) => {
  switch (status) {
    case "OPEN":
      return "destructive";
    case "UNDER_TREATMENT":
      return "warning";
    case "MONITORING":
      return "info";
    case "RESOLVED":
      return "success";
    case "CLOSED":
      return "secondary";
    default:
      return "outline";
  }
};

const resolveOptionLabel = (
  options: LocalizedOption[],
  value: string | null | undefined,
  translate: (key: string, optionsOrDefault?: Record<string, unknown> | string) => string,
) => {
  const matched = options.find((option) => option.value === value);
  if (matched) {
    return translate(matched.labelKey, matched.fallbackLabel);
  }
  return value ?? "-";
};

const getActorBadgeClass = (actorType?: string | null) => {
  if (actorType === "EMPLOYEE") return "bg-sky-100 text-sky-800 border-sky-200";
  if (actorType === "FARMER") return "bg-emerald-100 text-emerald-800 border-emerald-200";
  return "bg-muted text-muted-foreground border-border";
};

export function DiseaseTrackingPage() {
  const { t, locale } = useI18n();
  const seasonContext = useOptionalSeason();
  const location = useLocation();
  const { seasonId: seasonIdParam } = useParams();
  const workspaceScope = location.pathname.startsWith("/employee") ? "employee" : "farmer";
  const isEmployeeWorkspace = workspaceScope === "employee";

  const workspaceSeasonId = Number(seasonIdParam);
  const hasValidSeasonId = Number.isFinite(workspaceSeasonId) && workspaceSeasonId > 0;
  const selectedSeasonId = hasValidSeasonId ? workspaceSeasonId : 0;

  const [keyword, setKeyword] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [severityFilter, setSeverityFilter] = useState<string>("all");

  const [isRecordDialogOpen, setIsRecordDialogOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<DiseaseRecord | null>(null);
  const [recordForm, setRecordForm] = useState<DiseaseRecordFormState>(initialRecordFormState);
  const [deleteRecordId, setDeleteRecordId] = useState<number | null>(null);

  const [expandedRecordId, setExpandedRecordId] = useState<number | null>(null);

  const [isTreatmentDialogOpen, setIsTreatmentDialogOpen] = useState(false);
  const [activeTreatmentRecordId, setActiveTreatmentRecordId] = useState<number | null>(null);
  const [editingTreatment, setEditingTreatment] = useState<DiseaseTreatment | null>(null);
  const [treatmentForm, setTreatmentForm] = useState<DiseaseTreatmentFormState>(
    initialTreatmentFormState,
  );
  const [deleteTreatmentTarget, setDeleteTreatmentTarget] = useState<{
    diseaseRecordId: number;
    treatmentId: number;
  } | null>(null);
  const [aiAdditionalNote, setAiAdditionalNote] = useState("");
  const [aiIncludeInventory, setAiIncludeInventory] = useState(true);
  const [aiSuggestion, setAiSuggestion] = useState<DiseaseSuggestionResponse | null>(null);
  const [aiSuggestionError, setAiSuggestionError] = useState<string | null>(null);

  useEffect(() => {
    if (!hasValidSeasonId) return;
    if (seasonContext?.selectedSeasonId === selectedSeasonId) return;
    seasonContext?.setSelectedSeasonId(selectedSeasonId);
  }, [hasValidSeasonId, seasonContext, selectedSeasonId]);

  const { data: seasonDetail } = useSeasonById(selectedSeasonId, {
    enabled: hasValidSeasonId && !isEmployeeWorkspace,
  });
  const { data: employeeSeasons } = useEmployeeAssignedSeasons({
    enabled: hasValidSeasonId && isEmployeeWorkspace,
  });
  const employeeSeason = employeeSeasons?.find((season) => season.seasonId === selectedSeasonId);
  const selectedSeasonStatus =
    employeeSeason?.status
    ?? seasonDetail?.status
    ?? seasonContext?.seasons.find((season) => season.id === selectedSeasonId)?.status
    ?? null;

  const isSeasonWriteLocked =
    selectedSeasonStatus === "COMPLETED"
    || selectedSeasonStatus === "CANCELLED"
    || selectedSeasonStatus === "ARCHIVED";
  const seasonWriteLockReason = isSeasonWriteLocked
    ? t("diseaseTracking.season.writeLocked")
    : undefined;

  const {
    data: recordsData,
    isLoading: isRecordsLoading,
    error: recordsError,
    refetch: refetchRecords,
  } = useDiseaseRecords(
    selectedSeasonId,
    {
      status: statusFilter !== "all" ? (statusFilter as DiseaseStatus) : undefined,
      severity:
        severityFilter !== "all"
          ? (severityFilter as DiseaseRecordCreateRequest["severity"])
          : undefined,
      q: keyword.trim() || undefined,
      page: 0,
      size: 100,
    },
    { enabled: hasValidSeasonId },
    workspaceScope,
  );

  const detailRecordId = expandedRecordId ?? 0;
  const {
    data: detailData,
    isLoading: isDetailLoading,
    error: detailError,
  } = useDiseaseRecordDetail(detailRecordId, {
    enabled: detailRecordId > 0,
  }, workspaceScope);

  const {
    data: treatmentListData,
    isLoading: isTreatmentListLoading,
    error: treatmentListError,
  } = useDiseaseTreatments(detailRecordId, { page: 0, size: 100 }, {
    enabled: detailRecordId > 0,
  }, workspaceScope);

  useEffect(() => {
    setAiSuggestion(null);
    setAiSuggestionError(null);
    setAiAdditionalNote("");
    setAiIncludeInventory(true);
  }, [detailRecordId]);

  const { data: farmerSupplyItems = [] } = useAllSupplyItems({
    enabled: !isEmployeeWorkspace,
  });
  const { data: employeeSupplyItemsData } = useEmployeeSeasonSupplyItems(
    selectedSeasonId,
    { page: 0, size: 1000 },
    { enabled: isEmployeeWorkspace && hasValidSeasonId },
  );
  const supplyItems = isEmployeeWorkspace
    ? employeeSupplyItemsData?.items ?? []
    : farmerSupplyItems;

  const selectedSupplyItemId = parseOptionalSelectId(treatmentForm.supplyItemId);
  const supplyLotParams = selectedSupplyItemId
    ? { itemId: selectedSupplyItemId, page: 0, size: 100 }
    : undefined;
  const { data: farmerSupplyLotsData } = useSupplyLots(
    supplyLotParams,
    { enabled: !isEmployeeWorkspace && Boolean(selectedSupplyItemId) },
  );
  const { data: employeeSupplyLotsData } = useEmployeeSeasonSupplyLots(
    selectedSeasonId,
    selectedSupplyItemId
      ? { itemId: selectedSupplyItemId, page: 0, size: 100 }
      : undefined,
    { enabled: isEmployeeWorkspace && hasValidSeasonId && Boolean(selectedSupplyItemId) },
  );
  const supplyLots = (isEmployeeWorkspace ? employeeSupplyLotsData : farmerSupplyLotsData)?.items ?? [];

  const createRecordMutation = useCreateDiseaseRecord({
    onSuccess: () => {
      toast.success(t("diseaseTracking.toast.recordCreated"));
      closeRecordDialog();
    },
    onError: (error) => {
      toast.error(
        toReadableError(error, t, "diseaseTracking.errors.createRecordFail", "Unable to create disease record."),
      );
    },
  }, workspaceScope);

  const updateRecordMutation = useUpdateDiseaseRecord({
    onSuccess: () => {
      toast.success(t("diseaseTracking.toast.recordUpdated"));
      closeRecordDialog();
    },
    onError: (error) => {
      toast.error(
        toReadableError(error, t, "diseaseTracking.errors.updateRecordFail", "Unable to update disease record."),
      );
    },
  }, workspaceScope);

  const deleteRecordMutation = useDeleteDiseaseRecord({
    onSuccess: () => {
      toast.success(t("diseaseTracking.toast.recordDeleted"));
      setDeleteRecordId(null);
      if (expandedRecordId && expandedRecordId === deleteRecordId) {
        setExpandedRecordId(null);
      }
    },
    onError: (error) => {
      toast.error(
        toReadableError(error, t, "diseaseTracking.errors.deleteRecordFail", "Unable to delete disease record."),
      );
    },
  }, workspaceScope);

  const createTreatmentMutation = useCreateDiseaseTreatment({
    onSuccess: () => {
      toast.success(t("diseaseTracking.toast.treatmentCreated"));
      closeTreatmentDialog();
    },
    onError: (error) => {
      toast.error(
        toReadableError(
          error,
          t,
          "diseaseTracking.errors.createTreatmentFail",
          "Unable to add treatment history.",
        ),
      );
    },
  }, workspaceScope);

  const updateTreatmentMutation = useUpdateDiseaseTreatment({
    onSuccess: () => {
      toast.success(t("diseaseTracking.toast.treatmentUpdated"));
      closeTreatmentDialog();
    },
    onError: (error) => {
      toast.error(
        toReadableError(
          error,
          t,
          "diseaseTracking.errors.updateTreatmentFail",
          "Unable to update treatment history.",
        ),
      );
    },
  }, workspaceScope);

  const deleteTreatmentMutation = useDeleteDiseaseTreatment({
    onSuccess: () => {
      toast.success(t("diseaseTracking.toast.treatmentDeleted"));
      setDeleteTreatmentTarget(null);
    },
    onError: (error) => {
      toast.error(
        toReadableError(
          error,
          t,
          "diseaseTracking.errors.deleteTreatmentFail",
          "Unable to delete treatment history.",
        ),
      );
    },
  }, workspaceScope);

  const aiSuggestionMutation = useDiseaseAiSuggestion({
    onSuccess: (result) => {
      setAiSuggestion(result);
      setAiSuggestionError(null);
    },
    onError: (error) => {
      const message = toReadableError(
        error,
        t,
        "diseaseTracking.errors.aiSuggestionFail",
        "Unable to generate AI suggestion right now.",
      );
      setAiSuggestion(null);
      setAiSuggestionError(message);
      toast.error(message);
    },
  }, workspaceScope);

  const records = recordsData?.items ?? [];
  const treatmentTimeline = treatmentListData?.items ?? [];
  const activeRecordDetail = detailData?.record ?? null;
  const totalTreatmentCost = detailData?.totalTreatmentCost ?? null;
  const aiSuggestionForActiveRecord = aiSuggestion?.diseaseRecordId === detailRecordId
    ? aiSuggestion
    : null;
  const aiDisclaimerText = t(
    "diseaseTracking.detail.ai.disclaimer",
    "Suggestions are for reference only and do not replace expert consultation.",
  );
  const isMutating =
    createRecordMutation.isPending
    || updateRecordMutation.isPending
    || deleteRecordMutation.isPending
    || createTreatmentMutation.isPending
    || updateTreatmentMutation.isPending
    || deleteTreatmentMutation.isPending;
  const parsedAffectedPlantCount = parseNonNegativeIntegerInput(recordForm.affectedPlantCount);
  const parsedAffectedAreaPercent = parseNonNegativeDecimalInput(recordForm.affectedAreaPercent);
  const parsedTreatmentQuantityUsed = parseNonNegativeDecimalInput(treatmentForm.quantityUsed);
  const parsedTreatmentCostAmount = parseNonNegativeDecimalInput(treatmentForm.costAmount);
  const isRecordDetectedAtValid =
    Boolean(recordForm.detectedAt)
    && !Number.isNaN(new Date(toApiDateTime(recordForm.detectedAt)).getTime());
  const isTreatmentDateValid =
    Boolean(treatmentForm.treatedAt)
    && !Number.isNaN(new Date(toApiDateTime(treatmentForm.treatedAt)).getTime());
  const isRecordFormSubmittable =
    Boolean(recordForm.diseaseName.trim())
    && isRecordDetectedAtValid
    && !parsedAffectedPlantCount.isInvalid
    && !parsedAffectedAreaPercent.isInvalid;
  const isTreatmentFormSubmittable =
    Boolean(activeTreatmentRecordId)
    && Boolean(treatmentForm.method.trim())
    && isTreatmentDateValid
    && !parsedTreatmentQuantityUsed.isInvalid
    && !parsedTreatmentCostAmount.isInvalid;
  const recordsErrorForView = recordsError
    ? new Error(
      toReadableError(
        recordsError,
        t,
        "diseaseTracking.errors.loadRecordsFail",
        "Unable to load disease records.",
      ),
    )
    : null;
  const detailPanelErrorMessage = toReadableError(
    detailError ?? treatmentListError,
    t,
    "diseaseTracking.errors.loadDetailFail",
    "Unable to load disease record details. Please try again.",
  );
  const getSeverityLabel = (severity?: string | null) =>
    resolveOptionLabel(DISEASE_SEVERITY_OPTIONS, severity, t);
  const getStatusLabel = (status?: string | null) =>
    resolveOptionLabel(DISEASE_STATUS_OPTIONS, status, t);
  const getEffectivenessLabel = (effectiveness?: string | null) =>
    resolveOptionLabel(TREATMENT_EFFECTIVENESS_OPTIONS, effectiveness, t);

  const summary = useMemo(() => {
    const total = records.length;
    const open = records.filter((item) => item.status === "OPEN").length;
    const underTreatment = records.filter((item) => item.status === "UNDER_TREATMENT").length;
    const resolved = records.filter((item) => item.status === "RESOLVED" || item.status === "CLOSED").length;
    return { total, open, underTreatment, resolved };
  }, [records]);

  const ensureWritable = () => {
    if (!isSeasonWriteLocked) return true;
    toast.error(seasonWriteLockReason);
    return false;
  };

  const noPermissionMessage = t(
    "diseaseTracking.validation.noPermission",
  );

  const getActorLabel = (actorType?: string | null) => {
    if (actorType === "EMPLOYEE") return t("employee.actor.EMPLOYEE");
    if (actorType === "FARMER") return t("employee.actor.FARMER");
    return t("employee.actor.UNKNOWN");
  };

  const openCreateRecordDialog = () => {
    if (!ensureWritable()) return;
    setEditingRecord(null);
    setRecordForm(initialRecordFormState());
    setIsRecordDialogOpen(true);
  };

  const openEditRecordDialog = (record: DiseaseRecord) => {
    if (!ensureWritable()) return;
    if (record.canEdit === false) {
      toast.error(noPermissionMessage);
      return;
    }
    setEditingRecord(record);
    setRecordForm({
      diseaseName: record.diseaseName ?? "",
      symptomSummary: record.symptomSummary ?? "",
      severity: record.severity ?? "MEDIUM",
      status: record.status ?? "OPEN",
      detectedAt: toDateTimeInput(record.detectedAt),
      affectedPlantCount:
        record.affectedPlantCount !== undefined && record.affectedPlantCount !== null
          ? String(record.affectedPlantCount)
          : "",
      affectedAreaPercent:
        record.affectedAreaValue !== undefined && record.affectedAreaValue !== null
          ? String(record.affectedAreaValue)
          : "",
      evidenceUrl: record.evidenceUrl ?? "",
      notes: record.notes ?? "",
    });
    setIsRecordDialogOpen(true);
  };

  const closeRecordDialog = () => {
    setIsRecordDialogOpen(false);
    setEditingRecord(null);
    setRecordForm(initialRecordFormState());
  };

  const handleSubmitRecord = () => {
    if (!ensureWritable()) return;
    if (!recordForm.diseaseName.trim()) {
      toast.error(t("diseaseTracking.validation.diseaseNameRequired"));
      return;
    }
    if (!recordForm.detectedAt) {
      toast.error(t("diseaseTracking.validation.detectedAtRequired"));
      return;
    }
    if (!isRecordDetectedAtValid) {
      toast.error(t("diseaseTracking.validation.detectedAtInvalid"));
      return;
    }
    if (parsedAffectedPlantCount.isInvalid) {
      toast.error(t("diseaseTracking.validation.affectedPlantCountInvalid"));
      return;
    }
    if (parsedAffectedAreaPercent.isInvalid) {
      toast.error(t("diseaseTracking.validation.affectedAreaInvalid"));
      return;
    }
    const affectedAreaValue = parsedAffectedAreaPercent.value;

    const payloadBase: DiseaseRecordCreateRequest = {
      diseaseName: recordForm.diseaseName.trim(),
      symptomSummary: recordForm.symptomSummary.trim() || undefined,
      severity: recordForm.severity as DiseaseRecordCreateRequest["severity"],
      status: recordForm.status as DiseaseRecordCreateRequest["status"],
      detectedAt: toApiDateTime(recordForm.detectedAt),
      affectedPlantCount: parsedAffectedPlantCount.value,
      affectedAreaValue,
      affectedAreaUnit: affectedAreaValue !== undefined ? "%" : undefined,
      evidenceUrl: recordForm.evidenceUrl.trim() || undefined,
      notes: recordForm.notes.trim() || undefined,
    };

    if (editingRecord) {
      const updatePayload: DiseaseRecordUpdateRequest = payloadBase;
      updateRecordMutation.mutate({
        seasonId: selectedSeasonId,
        id: editingRecord.id,
        data: updatePayload,
      });
      return;
    }

    createRecordMutation.mutate({
      seasonId: selectedSeasonId,
      data: payloadBase,
    });
  };

  const handleDeleteRecord = () => {
    if (!ensureWritable()) {
      setDeleteRecordId(null);
      return;
    }
    if (!deleteRecordId) return;
    const target = records.find((record) => record.id === deleteRecordId);
    if (target?.canDelete === false) {
      toast.error(noPermissionMessage);
      setDeleteRecordId(null);
      return;
    }
    deleteRecordMutation.mutate({
      seasonId: selectedSeasonId,
      id: deleteRecordId,
    });
  };

  const toggleRecordDetail = (recordId: number) => {
    setExpandedRecordId((previous) => (previous === recordId ? null : recordId));
  };

  const handleGenerateAiSuggestion = (recordId: number) => {
    const trimmedAdditionalNote = aiAdditionalNote.trim();
    if (trimmedAdditionalNote.length > 4000) {
      const message = t("diseaseTracking.validation.additionalNoteTooLong");
      setAiSuggestion(null);
      setAiSuggestionError(message);
      toast.error(message);
      return;
    }
    setAiSuggestion(null);
    setAiSuggestionError(null);
    aiSuggestionMutation.mutate({
      id: recordId,
      data: {
        includeInventory: aiIncludeInventory,
        additionalNote: trimmedAdditionalNote || undefined,
      },
    });
  };

  const openCreateTreatmentDialog = (recordId: number) => {
    if (!ensureWritable()) return;
    setActiveTreatmentRecordId(recordId);
    setEditingTreatment(null);
    setTreatmentForm(initialTreatmentFormState());
    setIsTreatmentDialogOpen(true);
  };

  const openEditTreatmentDialog = (recordId: number, treatment: DiseaseTreatment) => {
    if (!ensureWritable()) return;
    if (treatment.canEdit === false) {
      toast.error(noPermissionMessage);
      return;
    }
    setActiveTreatmentRecordId(recordId);
    setEditingTreatment(treatment);
    setTreatmentForm({
      treatedAt: toDateTimeInput(treatment.treatedAt),
      method: treatment.method ?? "",
      supplyItemId:
        treatment.supplyItemId !== undefined && treatment.supplyItemId !== null
          ? String(treatment.supplyItemId)
          : "none",
      supplyLotId:
        treatment.supplyLotId !== undefined && treatment.supplyLotId !== null
          ? String(treatment.supplyLotId)
          : "none",
      quantityUsed:
        treatment.quantityUsed !== undefined && treatment.quantityUsed !== null
          ? String(treatment.quantityUsed)
          : "",
      unit: treatment.unit ?? "",
      dosageNote: treatment.notes ?? "",
      costAmount:
        treatment.costAmount !== undefined && treatment.costAmount !== null
          ? String(treatment.costAmount)
          : "",
      resultNote: treatment.resultSummary ?? "",
      effectiveness: treatment.effectiveness ?? "UNKNOWN",
    });
    setIsTreatmentDialogOpen(true);
  };

  const closeTreatmentDialog = () => {
    setIsTreatmentDialogOpen(false);
    setActiveTreatmentRecordId(null);
    setEditingTreatment(null);
    setTreatmentForm(initialTreatmentFormState());
  };

  const handleSubmitTreatment = () => {
    if (!ensureWritable()) return;
    if (!activeTreatmentRecordId) {
      toast.error(t("diseaseTracking.validation.recordNotFoundForTreatment"));
      return;
    }
    if (!treatmentForm.treatedAt) {
      toast.error(t("diseaseTracking.validation.treatedAtRequired"));
      return;
    }
    if (!treatmentForm.method.trim()) {
      toast.error(t("diseaseTracking.validation.methodRequired"));
      return;
    }
    if (!isTreatmentDateValid) {
      toast.error(t("diseaseTracking.validation.treatedAtInvalid"));
      return;
    }
    if (parsedTreatmentQuantityUsed.isInvalid) {
      toast.error(t("diseaseTracking.validation.quantityUsedInvalid"));
      return;
    }
    if (parsedTreatmentCostAmount.isInvalid) {
      toast.error(t("diseaseTracking.validation.costAmountInvalid"));
      return;
    }

    const payloadBase: DiseaseTreatmentCreateRequest = {
      treatedAt: toApiDateTime(treatmentForm.treatedAt),
      method: treatmentForm.method.trim(),
      supplyItemId: parseOptionalSelectId(treatmentForm.supplyItemId),
      supplyLotId: parseOptionalSelectId(treatmentForm.supplyLotId),
      quantityUsed: parsedTreatmentQuantityUsed.value,
      unit: treatmentForm.unit.trim() || undefined,
      notes: treatmentForm.dosageNote.trim() || undefined,
      costAmount: parsedTreatmentCostAmount.value,
      resultSummary: treatmentForm.resultNote.trim() || undefined,
      effectiveness: treatmentForm.effectiveness as DiseaseTreatmentCreateRequest["effectiveness"],
    };

    if (editingTreatment) {
      const updatePayload: DiseaseTreatmentUpdateRequest = payloadBase;
      updateTreatmentMutation.mutate({
        diseaseRecordId: activeTreatmentRecordId,
        id: editingTreatment.id,
        data: updatePayload,
      });
      return;
    }

    createTreatmentMutation.mutate({
      diseaseRecordId: activeTreatmentRecordId,
      data: payloadBase,
    });
  };

  const handleDeleteTreatment = () => {
    if (!ensureWritable()) {
      setDeleteTreatmentTarget(null);
      return;
    }
    if (!deleteTreatmentTarget) return;
    const targetTreatment = treatmentTimeline.find(
      (treatment) => treatment.id === deleteTreatmentTarget.treatmentId,
    );
    if (targetTreatment?.canDelete === false) {
      toast.error(noPermissionMessage);
      setDeleteTreatmentTarget(null);
      return;
    }
    deleteTreatmentMutation.mutate({
      diseaseRecordId: deleteTreatmentTarget.diseaseRecordId,
      id: deleteTreatmentTarget.treatmentId,
    });
  };

  if (!hasValidSeasonId) {
    return (
      <PageContainer>
        <Card className="border border-destructive/20 bg-destructive/5">
          <CardContent className="py-6 text-sm text-destructive">
            {t("diseaseTracking.season.invalid")}
          </CardContent>
        </Card>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <div className="mb-6">
        <PageHeader
          icon={<Bug className="w-8 h-8" />}
          title={t("diseaseTracking.title")}
          subtitle={t("diseaseTracking.subtitle")}
          actions={(
            <Button
              className="min-h-[44px]"
              onClick={openCreateRecordDialog}
              disabled={isSeasonWriteLocked}
              title={isSeasonWriteLocked ? seasonWriteLockReason : undefined}
            >
              <Plus className="w-4 h-4 mr-2" />
              {t("diseaseTracking.actions.addRecord")}
            </Button>
          )}
        />
      </div>

      <Card className="mb-6 border border-border rounded-xl shadow-sm">
        <CardContent className="px-6 py-4 space-y-4">
          <div className="rounded-lg border border-border bg-card px-3 py-2 text-sm">
            {t("diseaseTracking.season.label")}{" "}
            <span className="font-medium">
              {employeeSeason?.seasonName ?? seasonDetail?.seasonName ?? `#${selectedSeasonId}`}
            </span>
          </div>

          {isSeasonWriteLocked && (
            <div className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              {seasonWriteLockReason}
            </div>
          )}

          <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
            <div className="rounded-lg border border-border bg-card px-3 py-3">
              <p className="text-sm text-muted-foreground">{t("diseaseTracking.summary.totalRecords")}</p>
              <p className="text-2xl font-semibold">{summary.total}</p>
            </div>
            <div className="rounded-lg border border-border bg-card px-3 py-3">
              <p className="text-sm text-muted-foreground">{t("diseaseTracking.summary.newDetected")}</p>
              <p className="text-2xl font-semibold">{summary.open}</p>
            </div>
            <div className="rounded-lg border border-border bg-card px-3 py-3">
              <p className="text-sm text-muted-foreground">{t("diseaseTracking.summary.underTreatment")}</p>
              <p className="text-2xl font-semibold">{summary.underTreatment}</p>
            </div>
            <div className="rounded-lg border border-border bg-card px-3 py-3">
              <p className="text-sm text-muted-foreground">{t("diseaseTracking.summary.resolvedClosed")}</p>
              <p className="text-2xl font-semibold">{summary.resolved}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative w-full md:w-[320px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={keyword}
                onChange={(event) => setKeyword(event.target.value)}
                className="pl-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background"
                placeholder={t("diseaseTracking.filters.searchPlaceholder")}
              />
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-[220px]">
                <SelectValue placeholder={t("diseaseTracking.filters.statusPlaceholder")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("diseaseTracking.filters.allStatuses")}</SelectItem>
                {DISEASE_STATUS_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {t(option.labelKey, option.fallbackLabel)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={severityFilter} onValueChange={setSeverityFilter}>
              <SelectTrigger className="w-full md:w-[220px]">
                <SelectValue placeholder={t("diseaseTracking.filters.severityPlaceholder")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("diseaseTracking.filters.allSeverities")}</SelectItem>
                {DISEASE_SEVERITY_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {t(option.labelKey, option.fallbackLabel)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button variant="outline" className="min-h-[44px]" onClick={() => refetchRecords()}>
              {t("diseaseTracking.actions.refresh")}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border border-border rounded-xl shadow-sm">
        <CardContent className="px-6 py-4">
          <AsyncState
            isLoading={isRecordsLoading}
            isEmpty={records.length === 0}
            error={recordsErrorForView}
            onRetry={() => refetchRecords()}
            loadingText={t("diseaseTracking.list.loadingRecords")}
            emptyIcon={<ShieldAlert className="w-6 h-6 text-muted-foreground" />}
            emptyTitle={t("diseaseTracking.list.emptyTitle")}
            emptyDescription={t("diseaseTracking.list.emptyDescription")}
            emptyAction={(
              <Button
                className="min-h-[44px]"
                onClick={openCreateRecordDialog}
                disabled={isSeasonWriteLocked}
              >
                <Plus className="w-4 h-4 mr-2" />
                {t("diseaseTracking.actions.addRecord")}
              </Button>
            )}
          >
            <div className="space-y-4">
              {records.map((record) => {
                const isExpanded = expandedRecordId === record.id;
                const usingDetail = isExpanded && activeRecordDetail && activeRecordDetail.id === record.id;
                const recordToRender = usingDetail ? activeRecordDetail : record;
                return (
                  <div key={record.id} className="rounded-xl border border-border bg-card p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-lg font-semibold text-foreground">
                            {recordToRender.diseaseName}
                          </h3>
                          <Badge variant={getSeverityBadgeVariant(recordToRender.severity)}>
                            {getSeverityLabel(recordToRender.severity)}
                          </Badge>
                          <Badge variant={getStatusBadgeVariant(recordToRender.status)}>
                            {getStatusLabel(recordToRender.status)}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {t("diseaseTracking.recordCard.detectedAt")}: {formatDateTime(recordToRender.detectedAt, locale)}
                        </p>
                        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                          <span>
                            {t("diseaseTracking.recordCard.reportedBy", "Người ghi")}:{" "}
                            <span className="font-medium text-foreground">
                              {recordToRender.reportedByDisplayName ?? recordToRender.reportedByUsername ?? "-"}
                            </span>
                          </span>
                          <Badge className={getActorBadgeClass(recordToRender.reportedByType)}>
                            {getActorLabel(recordToRender.reportedByType)}
                          </Badge>
                        </div>
                        {recordToRender.symptomSummary && (
                          <p className="text-sm text-foreground">{recordToRender.symptomSummary}</p>
                        )}
                        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                          <span>
                            {t("diseaseTracking.recordCard.affectedPlantCount")}:{" "}
                            {formatNumber(recordToRender.affectedPlantCount, locale)}
                          </span>
                          <span>
                            {t("diseaseTracking.recordCard.affectedArea")}:
                            {" "}
                            {recordToRender.affectedAreaValue !== undefined && recordToRender.affectedAreaValue !== null
                              ? `${recordToRender.affectedAreaValue} ${recordToRender.affectedAreaUnit ?? ""}`.trim()
                              : "-"}
                          </span>
                          <span>
                            {t("diseaseTracking.recordCard.treatmentCount")}: {recordToRender.treatmentCount ?? 0}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <Button
                          variant="outline"
                          onClick={() => openCreateTreatmentDialog(record.id)}
                          disabled={isSeasonWriteLocked}
                          title={isSeasonWriteLocked ? seasonWriteLockReason : undefined}
                          className="min-h-[44px] shadow-sm transition-all duration-200 hover:scale-[1.02] hover:shadow-md active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background"
                        >
                          <FlaskConical className="w-4 h-4 mr-2" />
                          {t("diseaseTracking.actions.addTreatment")}
                        </Button>
                        <Button
                          variant="outline"
                          className="min-h-[44px] shadow-sm transition-all duration-200 hover:scale-[1.02] hover:shadow-md active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background"
                          onClick={() => openEditRecordDialog(record)}
                          disabled={isSeasonWriteLocked || record.canEdit === false}
                          title={isSeasonWriteLocked
                            ? seasonWriteLockReason
                            : record.canEdit === false
                              ? noPermissionMessage
                              : undefined}
                        >
                          <Pencil className="w-4 h-4 mr-2" />
                          {t("diseaseTracking.actions.edit")}
                        </Button>
                        <Button
                          variant="outline"
                          className="min-h-[44px] text-destructive shadow-sm transition-all duration-200 hover:scale-[1.02] hover:shadow-md active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive focus-visible:ring-offset-2 ring-offset-background hover:bg-destructive/10"
                          onClick={() => setDeleteRecordId(record.id)}
                          disabled={isSeasonWriteLocked || record.canDelete === false}
                          title={isSeasonWriteLocked
                            ? seasonWriteLockReason
                            : record.canDelete === false
                              ? noPermissionMessage
                              : undefined}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          {t("diseaseTracking.actions.delete")}
                        </Button>
                        <Button
                          variant="ghost"
                          onClick={() => toggleRecordDetail(record.id)}
                          className="min-h-[44px] shadow-sm transition-all duration-200 hover:scale-[1.02] hover:shadow-md active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background"
                        >
                          {isExpanded ? (
                            <>
                              {t("diseaseTracking.actions.hideDetails")}
                              <ChevronUp className="w-4 h-4 ml-2" />
                            </>
                          ) : (
                            <>
                              {t("diseaseTracking.actions.viewDetails")}
                              <ChevronDown className="w-4 h-4 ml-2" />
                            </>
                          )}
                        </Button>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="mt-4 rounded-lg border border-border bg-muted/20 p-4 space-y-4">
                        {isDetailLoading || isTreatmentListLoading ? (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            {t("diseaseTracking.detail.loading")}
                          </div>
                        ) : detailError || treatmentListError ? (
                          <div className="rounded-md border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive">
                            {detailPanelErrorMessage}
                          </div>
                        ) : (
                          <div className="space-y-4">
                            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                              <div className="rounded-lg border border-border bg-card p-3">
                                <p className="text-xs text-muted-foreground">{t("diseaseTracking.detail.reporter")}</p>
                                <p className="text-sm font-medium">
                                  {recordToRender.reportedByDisplayName ?? recordToRender.reportedByUsername ?? "-"}
                                </p>
                                <Badge className={getActorBadgeClass(recordToRender.reportedByType)}>
                                  {getActorLabel(recordToRender.reportedByType)}
                                </Badge>
                              </div>
                              <div className="rounded-lg border border-border bg-card p-3">
                                <p className="text-xs text-muted-foreground">
                                  {t("diseaseTracking.detail.totalTreatmentCost")}
                                </p>
                                <p className="text-sm font-medium">
                                  {formatCurrencyVnd(totalTreatmentCost, locale)}
                                </p>
                              </div>
                              <div className="rounded-lg border border-border bg-card p-3">
                                <p className="text-xs text-muted-foreground">{t("diseaseTracking.detail.latestTreatment")}</p>
                                <p className="text-sm font-medium">
                                  {formatDateTime(detailData?.latestTreatmentAt, locale)}
                                </p>
                              </div>
                              <div className="rounded-lg border border-border bg-card p-3">
                                <p className="text-xs text-muted-foreground">{t("diseaseTracking.detail.evidenceUrl")}</p>
                                <p className="text-sm break-all">
                                  {recordToRender.evidenceUrl ?? "-"}
                                </p>
                              </div>
                            </div>

                            {recordToRender.notes && (
                              <div className="rounded-lg border border-border bg-card p-3">
                                <p className="text-xs text-muted-foreground mb-1">{t("diseaseTracking.detail.caseNotes")}</p>
                                <p className="text-sm">{recordToRender.notes}</p>
                              </div>
                            )}

                            <div className="rounded-lg border border-border bg-card p-3 space-y-3">
                              <div className="flex flex-wrap items-start justify-between gap-3">
                                <div>
                                  <h4 className="text-sm font-semibold flex items-center gap-2">
                                    <Sparkles className="w-4 h-4" />
                                    {t("diseaseTracking.detail.ai.title")}
                                  </h4>
                                  <p className="text-xs text-muted-foreground mt-1">
                                    {t("diseaseTracking.detail.ai.description")}
                                  </p>
                                </div>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleGenerateAiSuggestion(record.id)}
                                  disabled={aiSuggestionMutation.isPending}
                                  className="min-h-[44px] shadow-sm transition-all duration-200 hover:scale-[1.02] hover:shadow-md active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background"
                                >
                                  {aiSuggestionMutation.isPending ? (
                                    <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                                  ) : (
                                    <Sparkles className="w-4 h-4 mr-1" />
                                  )}
                                  {t("diseaseTracking.detail.ai.generate")}
                                </Button>
                              </div>

                              <div className="space-y-2">
                                <Label htmlFor={`ai-note-${record.id}`}>
                                  {t("diseaseTracking.detail.ai.additionalNoteLabel")}
                                </Label>
                                <Textarea
                                  id={`ai-note-${record.id}`}
                                  rows={2}
                                  value={aiAdditionalNote}
                                  onChange={(event) => setAiAdditionalNote(event.target.value)}
                                  placeholder={t("diseaseTracking.detail.ai.additionalNotePlaceholder")}
                                />
                              </div>

                              <div className="rounded-md border border-border px-3 py-2 flex items-center justify-between gap-3">
                                <div>
                                  <p className="text-sm font-medium">
                                    {t("diseaseTracking.detail.ai.includeInventoryLabel")}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {t("diseaseTracking.detail.ai.includeInventoryDescription")}
                                  </p>
                                </div>
                                <Switch
                                  checked={aiIncludeInventory}
                                  onCheckedChange={(checked) => setAiIncludeInventory(Boolean(checked))}
                                  aria-label={t("diseaseTracking.detail.ai.includeInventoryAriaLabel")}
                                />
                              </div>

                              {aiSuggestionError && (
                                <div className="rounded-md border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                                  {t("diseaseTracking.detail.ai.generateErrorPrefix")} {aiSuggestionError}
                                </div>
                              )}

                              {aiSuggestionForActiveRecord && (
                                <div className="rounded-md border border-primary/20 bg-primary/5 p-3 space-y-2">
                                  <p className="text-xs text-muted-foreground">
                                    {t("diseaseTracking.detail.ai.generatedAt")}:{" "}
                                    {formatDateTime(aiSuggestionForActiveRecord.generatedAt, locale)}
                                  </p>
                                  <p className="text-sm whitespace-pre-wrap leading-6">
                                    {aiSuggestionForActiveRecord.suggestionText}
                                  </p>
                                  <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                                    {aiSuggestionForActiveRecord.warning ?? aiDisclaimerText}
                                  </div>
                                  <p className="text-xs text-muted-foreground">
                                    {aiDisclaimerText}
                                  </p>
                                </div>
                              )}
                            </div>

                            <div className="space-y-3">
                              <div className="flex items-center justify-between">
                                <h4 className="text-sm font-semibold flex items-center gap-2">
                                  <Stethoscope className="w-4 h-4" />
                                  {t("diseaseTracking.detail.timeline.title")}
                                </h4>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => openCreateTreatmentDialog(record.id)}
                                  disabled={isSeasonWriteLocked}
                                  title={isSeasonWriteLocked ? seasonWriteLockReason : undefined}
                                  className="min-h-[44px] shadow-sm transition-all duration-200 hover:scale-[1.02] hover:shadow-md active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background"
                                >
                                  <Plus className="w-4 h-4 mr-1" />
                                  {t("diseaseTracking.actions.addTimelineItem")}
                                </Button>
                              </div>

                              {treatmentTimeline.length === 0 ? (
                                <div className="rounded-md border border-dashed border-border p-4 text-sm text-muted-foreground">
                                  {t("diseaseTracking.detail.timeline.empty")}
                                </div>
                              ) : (
                                <div className="space-y-2">
                                  {treatmentTimeline.map((treatment) => (
                                    <div
                                      key={treatment.id}
                                      className="rounded-lg border border-border bg-card p-3"
                                    >
                                      <div className="flex flex-wrap items-start justify-between gap-3">
                                        <div className="space-y-1">
                                          <p className="text-sm font-medium">
                                            {formatDateTime(treatment.treatedAt, locale)} - {treatment.method}
                                          </p>
                                          <p className="text-xs text-muted-foreground">
                                            {t("diseaseTracking.detail.timeline.effectiveness")}:
                                            {" "}
                                            {getEffectivenessLabel(treatment.effectiveness)}
                                          </p>
                                          <p className="text-xs text-muted-foreground">
                                            {t("diseaseTracking.detail.timeline.material")}:
                                            {" "}
                                            {treatment.supplyItemName
                                              ?? treatment.materialName
                                              ?? "-"}
                                            {treatment.batchCode ? ` (${t("diseaseTracking.form.treatment.supplyLot")}: ${treatment.batchCode})` : ""}
                                          </p>
                                          <p className="text-xs text-muted-foreground">
                                            {t("diseaseTracking.detail.timeline.quantity")}:
                                            {" "}
                                            {treatment.quantityUsed !== undefined && treatment.quantityUsed !== null
                                              ? `${treatment.quantityUsed} ${treatment.unit ?? ""}`.trim()
                                              : "-"}
                                          </p>
                                          <p className="text-xs text-muted-foreground">
                                            {t("diseaseTracking.detail.timeline.cost")}:
                                            {" "}
                                            {treatment.costAmount !== undefined && treatment.costAmount !== null
                                              ? formatCurrencyVnd(treatment.costAmount, locale)
                                              : "-"}
                                          </p>
                                          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                            <span>
                                              {t("diseaseTracking.detail.timeline.createdBy", "Người ghi")}:{" "}
                                              {treatment.createdByDisplayName ?? treatment.createdByUsername ?? "-"}
                                            </span>
                                            <Badge className={getActorBadgeClass(treatment.createdByType)}>
                                              {getActorLabel(treatment.createdByType)}
                                            </Badge>
                                          </div>
                                        </div>
                                        <div className="flex gap-2">
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="min-h-[44px] min-w-[44px] transition-colors duration-200 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-md"
                                            onClick={() => openEditTreatmentDialog(record.id, treatment)}
                                            disabled={isSeasonWriteLocked || treatment.canEdit === false}
                                            title={isSeasonWriteLocked
                                              ? seasonWriteLockReason
                                              : treatment.canEdit === false
                                                ? noPermissionMessage
                                                : undefined}
                                          >
                                            <Pencil className="w-4 h-4" />
                                          </Button>
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="min-h-[44px] min-w-[44px] text-destructive hover:text-destructive hover:bg-destructive/10 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive rounded-md"
                                            onClick={() => setDeleteTreatmentTarget({
                                              diseaseRecordId: record.id,
                                              treatmentId: treatment.id,
                                            })}
                                            disabled={isSeasonWriteLocked || treatment.canDelete === false}
                                            title={isSeasonWriteLocked
                                              ? seasonWriteLockReason
                                              : treatment.canDelete === false
                                                ? noPermissionMessage
                                                : undefined}
                                          >
                                            <Trash2 className="w-4 h-4" />
                                          </Button>
                                        </div>
                                      </div>
                                      {treatment.resultSummary && (
                                        <p className="text-sm mt-2">{treatment.resultSummary}</p>
                                      )}
                                      {treatment.notes && (
                                        <p className="text-xs mt-2 text-muted-foreground">
                                          {t("diseaseTracking.detail.timeline.dosageNote")}: {treatment.notes}
                                        </p>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </AsyncState>
        </CardContent>
      </Card>

      <Dialog open={isRecordDialogOpen} onOpenChange={setIsRecordDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingRecord
                ? t("diseaseTracking.dialogs.record.editTitle")
                : t("diseaseTracking.dialogs.record.createTitle")}
            </DialogTitle>
            <DialogDescription>
              {t("diseaseTracking.dialogs.record.description")}
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="disease-name">
                {t("diseaseTracking.form.record.diseaseName")} <span className="text-destructive">*</span>
              </Label>
              <Input
                id="disease-name"
                value={recordForm.diseaseName}
                onChange={(event) =>
                  setRecordForm((previous) => ({ ...previous, diseaseName: event.target.value }))
                }
                placeholder={t("diseaseTracking.form.record.diseaseNamePlaceholder")}
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="disease-symptoms">{t("diseaseTracking.form.record.symptoms")}</Label>
              <Textarea
                id="disease-symptoms"
                rows={3}
                value={recordForm.symptomSummary}
                onChange={(event) =>
                  setRecordForm((previous) => ({ ...previous, symptomSummary: event.target.value }))
                }
                placeholder={t("diseaseTracking.form.record.symptomsPlaceholder")}
              />
            </div>

            <div className="space-y-2">
              <Label>{t("diseaseTracking.form.record.severity")}</Label>
              <Select
                value={recordForm.severity}
                onValueChange={(value) =>
                  setRecordForm((previous) => ({ ...previous, severity: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DISEASE_SEVERITY_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {t(option.labelKey, option.fallbackLabel)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{t("diseaseTracking.form.record.status")}</Label>
              <Select
                value={recordForm.status}
                onValueChange={(value) =>
                  setRecordForm((previous) => ({ ...previous, status: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DISEASE_STATUS_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {t(option.labelKey, option.fallbackLabel)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="disease-detected-at">
                {t("diseaseTracking.form.record.detectedAt")} <span className="text-destructive">*</span>
              </Label>
              <Input
                id="disease-detected-at"
                type="datetime-local"
                value={recordForm.detectedAt}
                onChange={(event) =>
                  setRecordForm((previous) => ({ ...previous, detectedAt: event.target.value }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="disease-affected-count">{t("diseaseTracking.form.record.affectedPlantCount")}</Label>
              <Input
                id="disease-affected-count"
                inputMode="numeric"
                value={recordForm.affectedPlantCount}
                onChange={(event) =>
                  setRecordForm((previous) => ({ ...previous, affectedPlantCount: event.target.value }))
                }
                placeholder={t("diseaseTracking.form.record.affectedPlantCountPlaceholder")}
              />
              {parsedAffectedPlantCount.isInvalid && (
                <p className="text-xs text-destructive">
                  {t("diseaseTracking.validation.nonNegativeIntegerHint")}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="disease-affected-area">{t("diseaseTracking.form.record.affectedAreaPercent")}</Label>
              <Input
                id="disease-affected-area"
                inputMode="decimal"
                value={recordForm.affectedAreaPercent}
                onChange={(event) =>
                  setRecordForm((previous) => ({ ...previous, affectedAreaPercent: event.target.value }))
                }
                placeholder={t("diseaseTracking.form.record.affectedAreaPercentPlaceholder")}
              />
              {parsedAffectedAreaPercent.isInvalid && (
                <p className="text-xs text-destructive">
                  {t("diseaseTracking.validation.nonNegativeNumberHint")}
                </p>
              )}
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="disease-evidence-url">{t("diseaseTracking.form.record.evidenceUrl")}</Label>
              <Input
                id="disease-evidence-url"
                value={recordForm.evidenceUrl}
                onChange={(event) =>
                  setRecordForm((previous) => ({ ...previous, evidenceUrl: event.target.value }))
                }
                placeholder="https://..."
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="disease-notes">{t("diseaseTracking.form.record.notes")}</Label>
              <Textarea
                id="disease-notes"
                rows={3}
                value={recordForm.notes}
                onChange={(event) =>
                  setRecordForm((previous) => ({ ...previous, notes: event.target.value }))
                }
                placeholder={t("diseaseTracking.form.record.notesPlaceholder")}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" className="min-h-[44px]" onClick={closeRecordDialog}>
              {t("diseaseTracking.actions.cancel")}
            </Button>
            <Button
              onClick={handleSubmitRecord}
              disabled={isMutating || !isRecordFormSubmittable}
              className="min-h-[44px] shadow-sm transition-all duration-200 hover:scale-[1.02] hover:shadow-md active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ring-offset-background"
            >
              {isMutating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editingRecord ? t("diseaseTracking.actions.update") : t("diseaseTracking.actions.create")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isTreatmentDialogOpen} onOpenChange={setIsTreatmentDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingTreatment
                ? t("diseaseTracking.dialogs.treatment.editTitle")
                : t("diseaseTracking.dialogs.treatment.createTitle")}
            </DialogTitle>
            <DialogDescription>
              {t("diseaseTracking.dialogs.treatment.description")}
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="treatment-date">
                {t("diseaseTracking.form.treatment.treatedAt")} <span className="text-destructive">*</span>
              </Label>
              <Input
                id="treatment-date"
                type="datetime-local"
                value={treatmentForm.treatedAt}
                onChange={(event) =>
                  setTreatmentForm((previous) => ({ ...previous, treatedAt: event.target.value }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="treatment-method">
                {t("diseaseTracking.form.treatment.method")} <span className="text-destructive">*</span>
              </Label>
              <Input
                id="treatment-method"
                value={treatmentForm.method}
                onChange={(event) =>
                  setTreatmentForm((previous) => ({ ...previous, method: event.target.value }))
                }
                placeholder={t("diseaseTracking.form.treatment.methodPlaceholder")}
              />
            </div>

            <div className="space-y-2">
              <Label>{t("diseaseTracking.form.treatment.supplyItem")}</Label>
              <Select
                value={treatmentForm.supplyItemId}
                onValueChange={(value) =>
                  setTreatmentForm((previous) => ({
                    ...previous,
                    supplyItemId: value,
                    supplyLotId: "none",
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("diseaseTracking.form.treatment.selectSupplyItem")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t("diseaseTracking.form.treatment.noneOption")}</SelectItem>
                  {supplyItems.map((item) => (
                    <SelectItem key={item.id} value={String(item.id)}>
                      {item.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{t("diseaseTracking.form.treatment.supplyLot")}</Label>
              <Select
                value={treatmentForm.supplyLotId}
                onValueChange={(value) =>
                  setTreatmentForm((previous) => ({ ...previous, supplyLotId: value }))
                }
                disabled={!selectedSupplyItemId}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={selectedSupplyItemId
                      ? t("diseaseTracking.form.treatment.selectSupplyLot")
                      : t("diseaseTracking.form.treatment.selectSupplyItemFirst")}
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t("diseaseTracking.form.treatment.noneOption")}</SelectItem>
                  {supplyLots.map((lot) => (
                    <SelectItem key={lot.id} value={String(lot.id)}>
                      {lot.batchCode ?? t("diseaseTracking.form.treatment.lotFallback", { id: lot.id })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="treatment-quantity">{t("diseaseTracking.form.treatment.quantityUsed")}</Label>
              <Input
                id="treatment-quantity"
                inputMode="decimal"
                value={treatmentForm.quantityUsed}
                onChange={(event) =>
                  setTreatmentForm((previous) => ({ ...previous, quantityUsed: event.target.value }))
                }
                placeholder={t("diseaseTracking.form.treatment.quantityUsedPlaceholder")}
              />
              {parsedTreatmentQuantityUsed.isInvalid && (
                <p className="text-xs text-destructive">
                  {t("diseaseTracking.validation.nonNegativeNumberHint")}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="treatment-unit">{t("diseaseTracking.form.treatment.unit")}</Label>
              <Input
                id="treatment-unit"
                value={treatmentForm.unit}
                onChange={(event) =>
                  setTreatmentForm((previous) => ({ ...previous, unit: event.target.value }))
                }
                placeholder={t("diseaseTracking.form.treatment.unitPlaceholder")}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="treatment-cost">{t("diseaseTracking.form.treatment.costAmountVnd")}</Label>
              <Input
                id="treatment-cost"
                inputMode="decimal"
                value={treatmentForm.costAmount}
                onChange={(event) =>
                  setTreatmentForm((previous) => ({ ...previous, costAmount: event.target.value }))
                }
                placeholder={t("diseaseTracking.form.treatment.costAmountPlaceholder")}
              />
              {parsedTreatmentCostAmount.isInvalid && (
                <p className="text-xs text-destructive">
                  {t("diseaseTracking.validation.nonNegativeNumberHint")}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>{t("diseaseTracking.form.treatment.effectiveness")}</Label>
              <Select
                value={treatmentForm.effectiveness}
                onValueChange={(value) =>
                  setTreatmentForm((previous) => ({ ...previous, effectiveness: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TREATMENT_EFFECTIVENESS_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {t(option.labelKey, option.fallbackLabel)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="treatment-dosage-note">{t("diseaseTracking.form.treatment.dosageNote")}</Label>
              <Textarea
                id="treatment-dosage-note"
                rows={2}
                value={treatmentForm.dosageNote}
                onChange={(event) =>
                  setTreatmentForm((previous) => ({ ...previous, dosageNote: event.target.value }))
                }
                placeholder={t("diseaseTracking.form.treatment.dosageNotePlaceholder")}
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="treatment-result-note">{t("diseaseTracking.form.treatment.resultNote")}</Label>
              <Textarea
                id="treatment-result-note"
                rows={3}
                value={treatmentForm.resultNote}
                onChange={(event) =>
                  setTreatmentForm((previous) => ({ ...previous, resultNote: event.target.value }))
                }
                placeholder={t("diseaseTracking.form.treatment.resultNotePlaceholder")}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" className="min-h-[44px]" onClick={closeTreatmentDialog}>
              {t("diseaseTracking.actions.cancel")}
            </Button>
            <Button
              onClick={handleSubmitTreatment}
              disabled={isMutating || !isTreatmentFormSubmittable}
              className="min-h-[44px] shadow-sm transition-all duration-200 hover:scale-[1.02] hover:shadow-md active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ring-offset-background"
            >
              {isMutating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editingTreatment ? t("diseaseTracking.actions.update") : t("diseaseTracking.actions.addTreatment")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteRecordId !== null} onOpenChange={() => setDeleteRecordId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("diseaseTracking.dialogs.deleteRecord.title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("diseaseTracking.dialogs.deleteRecord.description")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="min-h-[44px]">{t("diseaseTracking.actions.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              className="min-h-[44px] bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDeleteRecord}
            >
              {deleteRecordMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {t("diseaseTracking.actions.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={deleteTreatmentTarget !== null}
        onOpenChange={() => setDeleteTreatmentTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("diseaseTracking.dialogs.deleteTreatment.title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("diseaseTracking.dialogs.deleteTreatment.description")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="min-h-[44px]">{t("diseaseTracking.actions.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              className="min-h-[44px] bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDeleteTreatment}
            >
              {deleteTreatmentMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {t("diseaseTracking.actions.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {isMutating && (
        <div
          className="acm-page-loading-overlay"
          role="status"
          aria-live="polite"
          aria-label={t("diseaseTracking.overlay.processingAriaLabel")}
        >
          <div className="acm-page-loading-card acm-body-text">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <span>{t("diseaseTracking.overlay.processingText")}</span>
          </div>
        </div>
      )}

      {!hasValidSeasonId && (
        <div className="rounded-md border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          {t("diseaseTracking.season.invalid")}
        </div>
      )}
    </PageContainer>
  );
}
