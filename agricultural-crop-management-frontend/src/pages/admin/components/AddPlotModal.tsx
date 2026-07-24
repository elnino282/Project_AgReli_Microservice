import { useI18n } from "@/shared/lib/hooks/useI18n";
import {
  adminFarmApi,
  type AdminPlotCreateRequest,
} from "@/entities/user/api/api.admin";
import { BackButton } from "@/shared/ui/back-button";
import { useVietnameseAddress } from "@/shared/ui/address-selector";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, Loader2 } from "lucide-react";
import { useState } from "react";

interface AddPlotModalProps {
  farmId: number;
  farmName: string;
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

interface FormData {
  plotName: string;
  area: string;
  soilType: string;
}

export function AddPlotModal({
  farmId,
  farmName,
  open,
  onClose,
  onSuccess,
}: AddPlotModalProps) {
  const { t } = useI18n();
  const queryClient = useQueryClient();

  // Form state
  const [formData, setFormData] = useState<FormData>({
    plotName: "",
    area: "",
    soilType: "",
  });
  const [error, setError] = useState<string | null>(null);

  // Province/Ward cascade with ward reset on province change
  const {
    provinces,
    wards,
    selectedProvince,
    selectedWard,
    isLoadingProvinces,
    isLoadingWards,
    handleProvinceChange, // Automatically resets ward to null!
    handleWardChange,
  } = useVietnameseAddress();
  const isDirty =
    formData.plotName.trim().length > 0 ||
    formData.area.trim().length > 0 ||
    formData.soilType.trim().length > 0 ||
    selectedProvince != null ||
    selectedWard != null;

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (data: AdminPlotCreateRequest) =>
      adminFarmApi.addPlot(farmId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "farms", farmId] });
      queryClient.invalidateQueries({ queryKey: ["admin", "plots"] });
      onSuccess?.();
      handleReset();
      onClose();
    },
    onError: (err: any) => {
      const message =
        err.response?.data?.message || err.message || t("admin.farmsPlots.addPlot.error.addFailed");
      if (
        message.includes("Ward does not belong") ||
        err.response?.data?.code === "ERR_WARD_NOT_IN_PROVINCE"
      ) {
        setError(t("admin.farmsPlots.validation.wardProvinceMismatch"));
      } else {
        setError(message);
      }
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!formData.plotName.trim()) {
      setError(t("admin.farmsPlots.validation.plotNameRequired"));
      return;
    }

    // Build request
    const request: AdminPlotCreateRequest = {
      plotName: formData.plotName.trim(),
      area: formData.area ? parseFloat(formData.area) : undefined,
      soilType: formData.soilType.trim() || undefined,
      provinceId: selectedProvince ?? undefined,
      wardId: selectedWard ?? undefined,
    };

    createMutation.mutate(request);
  };

  const handleReset = () => {
    setFormData({
      plotName: "",
      area: "",
      soilType: "",
    });
    setError(null);
    handleProvinceChange(null);
  };
  const handleClose = () => {
    if (
      isDirty &&
      !window.confirm(t("common.unsavedChangesConfirm", "You have unsaved changes. Leave this page?"))
    ) {
      return;
    }

    handleReset();
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={handleClose} />

      {/* Modal */}
      <div className="relative bg-background border border-border rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="space-y-2">
            <BackButton onClick={handleClose} className="w-fit" />
            <h2 className="text-lg font-semibold">{t("admin.farmsPlots.addPlot.title")}</h2>
            <p className="text-sm text-muted-foreground">{t("admin.farmsPlots.addPlot.farmLabel", { name: farmName })}</p>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-4 overflow-y-auto max-h-[calc(90vh-140px)]">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Error Alert */}
            {error && (
              <div className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/30 rounded-lg text-destructive">
                <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
                <span className="text-sm">{error}</span>
              </div>
            )}

            {/* Plot Name */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">{t("admin.farmsPlots.addPlot.plotNameRequired")}</label>
              <input
                type="text"
                value={formData.plotName}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, plotName: e.target.value }))
                }
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm"
                placeholder={t("admin.farmsPlots.addPlot.plotNamePlaceholder")}
              />
            </div>

            {/* Area */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">{t("admin.farmsPlots.table.areaHa")}</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.area}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, area: e.target.value }))
                }
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm"
                placeholder={t("common.optional")}
              />
            </div>

            {/* Soil Type */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">{t("admin.farmsPlots.table.soilType")}</label>
              <input
                type="text"
                value={formData.soilType}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, soilType: e.target.value }))
                }
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm"
                placeholder={t("common.optional")}
              />
            </div>

            {/* Province - Optional */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">{t("admin.farmsPlots.addPlot.provinceOptional")}</label>
              <select
                value={selectedProvince ?? ""}
                onChange={(e) => {
                  const val = e.target.value ? Number(e.target.value) : null;
                  // CRITICAL: This resets ward to null automatically
                  handleProvinceChange(val);
                }}
                disabled={isLoadingProvinces}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm"
              >
                <option value="">{t("common.none")}</option>
                {provinces.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Ward - Optional, disabled until province selected */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">{t("admin.farmsPlots.addPlot.wardOptional")}</label>
              <select
                value={selectedWard ?? ""}
                onChange={(e) =>
                  handleWardChange(
                    e.target.value ? Number(e.target.value) : null,
                  )
                }
                disabled={!selectedProvince || isLoadingWards}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm disabled:opacity-50"
              >
                <option value="">
                  {isLoadingWards
                    ? t("common.loading")
                    : !selectedProvince
                      ? t("admin.farmsPlots.addPlot.selectProvinceFirst")
                      : t("common.none")}
                </option>
                {wards.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </select>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-border bg-muted/30">
          <button
            type="button"
            onClick={handleClose}
            disabled={createMutation.isPending}
            className="px-4 py-2 text-sm border border-border rounded-lg hover:bg-muted/50 disabled:opacity-50"
          >
            {t("common.cancel")}
          </button>
          <button
            type="submit"
            onClick={handleSubmit}
            disabled={createMutation.isPending}
            className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 inline-flex items-center gap-2"
          >
            {createMutation.isPending && (
              <Loader2 className="h-4 w-4 animate-spin" />
            )}
            {createMutation.isPending ? t("admin.farmsPlots.addPlot.adding") : t("admin.farmsPlots.addPlot.title")}
          </button>
        </div>
      </div>
    </div>
  );
}
