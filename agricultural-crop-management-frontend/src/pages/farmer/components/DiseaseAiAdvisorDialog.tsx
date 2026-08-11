import { useState } from "react";
import {
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Label,
  Switch,
  Textarea,
} from "@/shared/ui";
import { AlertCircle, CheckCircle2, Loader2, Sparkles } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { useDiseaseAiSuggestion, type DiseaseSuggestionResponse } from "@/entities/disease";
import type { DiseaseScope } from "@/entities/disease/model/keys";
import { useI18n } from "@/shared/lib/hooks/useI18n";
import { toast } from "sonner";
import { toReadableError } from "@/pages/farmer/DiseaseTrackingPage";

interface DiseaseAiAdvisorDialogProps {
  recordId: number;
  diseaseName: string;
  scope: DiseaseScope;
}

export function DiseaseAiAdvisorDialog({ recordId, diseaseName, scope }: DiseaseAiAdvisorDialogProps) {
  const { t } = useI18n();
  const [isOpen, setIsOpen] = useState(false);
  const [additionalNote, setAdditionalNote] = useState("");
  const [includeInventory, setIncludeInventory] = useState(true);
  const [result, setResult] = useState<DiseaseSuggestionResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const mutation = useDiseaseAiSuggestion(
    {
      onSuccess: (data) => {
        setResult(data);
        setErrorMessage(null);
      },
      onError: (error) => {
        const message = toReadableError(
          error,
          t,
          "diseaseTracking.errors.aiSuggestionFail",
          "Unable to generate AI suggestion right now.",
        );
        setErrorMessage(message);
        toast.error(message);
      },
    },
    scope,
  );

  const handleGenerate = () => {
    setErrorMessage(null);
    mutation.mutate({
      id: recordId,
      data: {
        includeInventory,
        additionalNote: additionalNote.trim() || undefined,
      },
    });
  };

  const handleReset = () => {
    setResult(null);
    setErrorMessage(null);
  };

  const disclaimer = t(
    "diseaseTracking.detail.ai.disclaimer",
    "Suggestions are for reference only and do not replace expert consultation.",
  );

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        setIsOpen(open);
        if (!open) handleReset();
      }}
    >
      <Button
        variant="outline"
        onClick={() => setIsOpen(true)}
        className="min-h-[44px] shadow-sm transition-all duration-200 hover:scale-[1.02] hover:shadow-md active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background"
      >
        <Sparkles className="w-4 h-4 mr-2" />
        {t("diseaseTracking.detail.ai.quickActionLabel", "Hỏi AI xử lý")}
      </Button>

      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            {t("diseaseTracking.detail.ai.dialogTitle", "Gợi ý xử lý từ AI")}
          </DialogTitle>
          <DialogDescription>{diseaseName}</DialogDescription>
        </DialogHeader>

        {!result && !mutation.isPending && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="ai-advisor-note">
                {t("diseaseTracking.detail.ai.additionalNoteLabel")}
              </Label>
              <Textarea
                id="ai-advisor-note"
                rows={2}
                value={additionalNote}
                onChange={(event) => setAdditionalNote(event.target.value)}
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
                checked={includeInventory}
                onCheckedChange={(checked) => setIncludeInventory(Boolean(checked))}
                aria-label={t("diseaseTracking.detail.ai.includeInventoryAriaLabel")}
              />
            </div>
            {errorMessage && (
              <div className="rounded-md border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                {errorMessage}
              </div>
            )}
            <DialogFooter>
              <Button onClick={handleGenerate}>
                <Sparkles className="w-4 h-4 mr-2" />
                {t("diseaseTracking.detail.ai.generate")}
              </Button>
            </DialogFooter>
          </div>
        )}

        {mutation.isPending && (
          <div className="py-10 flex flex-col items-center justify-center gap-3 text-muted-foreground">
            <Loader2 className="w-6 h-6 animate-spin" />
            <p className="text-sm">
              {t("diseaseTracking.detail.ai.loading", "Đang kiểm tra kho vật tư và tạo gợi ý...")}
            </p>
          </div>
        )}

        {result && (
          <div className="space-y-3">
            {result.matchedFromInventory === true && (
              <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {t("diseaseTracking.detail.ai.matchedBadge", "Có sẵn trong kho")}
              </Badge>
            )}
            {result.matchedFromInventory === false && (
              <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
                {t("diseaseTracking.detail.ai.externalBadge", "Không có trong kho — gợi ý từ nguồn ngoài")}
              </Badge>
            )}

            {result.summary && (
              <p className="text-sm font-medium text-foreground">{result.summary}</p>
            )}

            {result.matchedSupplyName && (
              <div className="rounded-lg border border-border bg-card p-3 text-sm">
                <p className="text-xs text-muted-foreground">
                  {t("diseaseTracking.detail.ai.matchedSupplyLabel", "Vật tư trong kho")}
                </p>
                <p className="font-medium">{result.matchedSupplyName}</p>
              </div>
            )}

            {result.recommendedProductName && (
              <div className="rounded-lg border border-border bg-card p-3 text-sm space-y-1">
                <div>
                  <p className="text-xs text-muted-foreground">
                    {t("diseaseTracking.detail.ai.recommendedProductLabel", "Thuốc đề xuất")}
                  </p>
                  <p className="font-medium">{result.recommendedProductName}</p>
                </div>
                {result.recommendedActiveIngredient && (
                  <div>
                    <p className="text-xs text-muted-foreground">
                      {t("diseaseTracking.detail.ai.recommendedActiveIngredientLabel", "Hoạt chất")}
                    </p>
                    <p className="font-medium">{result.recommendedActiveIngredient}</p>
                  </div>
                )}
              </div>
            )}

            {result.usageInstructions && (
              <div className="text-sm prose prose-sm dark:prose-invert max-w-none leading-6">
                <ReactMarkdown>{result.usageInstructions}</ReactMarkdown>
              </div>
            )}

            {result.safetyNotes && (
              <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                <p className="font-medium mb-1">
                  {t("diseaseTracking.detail.ai.safetyNotesLabel", "Lưu ý an toàn")}
                </p>
                {result.safetyNotes}
              </div>
            )}

            {!result.usageInstructions && !result.safetyNotes && result.suggestionText && (
              <div className="text-sm prose prose-sm dark:prose-invert max-w-none leading-6">
                <ReactMarkdown>{result.suggestionText}</ReactMarkdown>
              </div>
            )}

            <p className="text-xs text-muted-foreground">{disclaimer}</p>

            <DialogFooter>
              <Button variant="outline" onClick={handleReset}>
                {t("diseaseTracking.detail.ai.askAgain", "Hỏi lại")}
              </Button>
              <Button variant="ghost" onClick={() => setIsOpen(false)}>
                {t("diseaseTracking.actions.close", "Đóng")}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
