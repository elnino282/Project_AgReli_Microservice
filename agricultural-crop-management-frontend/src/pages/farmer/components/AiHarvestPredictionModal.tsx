import { useState } from "react";
import { Button } from "@/shared/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/shared/ui/dialog";
import { Bot, CalendarDays, ShieldAlert, Sparkles, AlertCircle } from "lucide-react";
import { aiApi } from "@/entities/ai/api/client";
import type { PredictHarvestResponse, PredictHarvestRequest } from "@/entities/ai/model/types";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/shared/ui/alert";
import { dashboardApi } from "@/features/farmer/dashboard/api/dashboardApi";

interface AiHarvestPredictionModalProps {
  seasonId: string;
  seasonName: string;
  plantingDate: string;
  plannedHarvestDate: string;
}

function calculateGrowthDays(plantingDate: string, plannedHarvestDate: string): number | null {
  const start = Date.parse(`${plantingDate}T00:00:00Z`);
  const plannedHarvest = Date.parse(`${plannedHarvestDate}T00:00:00Z`);
  if (!Number.isFinite(start) || !Number.isFinite(plannedHarvest) || plannedHarvest <= start) {
    return null;
  }
  return Math.round((plannedHarvest - start) / (24 * 60 * 60 * 1000));
}

export function AiHarvestPredictionModal({ seasonId, seasonName, plantingDate, plannedHarvestDate }: AiHarvestPredictionModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [prediction, setPrediction] = useState<PredictHarvestResponse | null>(null);

  const handlePredict = async () => {
    setIsLoading(true);
    try {
      const expectedGrowthDays = calculateGrowthDays(plantingDate, plannedHarvestDate);
      if (expectedGrowthDays == null) {
        throw new Error("Season does not have a valid persisted growth period");
      }
      const farmingLogs = await dashboardApi.getFarmingLogs(seasonId);
      const payload: PredictHarvestRequest = {
        cropName: seasonName,
        plantingDate,
        expectedGrowthDays,
        recentLogs: farmingLogs
          .filter((log) => log.status === "COMPLETED")
          .slice(0, 10)
          .map((log) => ({
            date: log.date,
            activityType: log.activityType,
            materialName: log.materialName || log.description,
            phiDays: log.quarantineDays ?? null,
          })),
      };
      
      const response = await aiApi.predictHarvest(payload);
      setPrediction(response);
    } catch (error) {
      console.error(error);
      toast.error("Không thể nhận dự đoán từ AI. Vui lòng thử lại sau.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-200">
          <Sparkles className="w-4 h-4" />
          AI Dự đoán thu hoạch
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bot className="w-5 h-5 text-emerald-600" />
            Trợ lý AI Nông nghiệp
          </DialogTitle>
        </DialogHeader>
        
        {!prediction ? (
          <div className="py-6 flex flex-col items-center justify-center text-center space-y-4">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600">
              <Bot className="w-8 h-8" />
            </div>
            <div>
              <h3 className="font-medium text-lg text-foreground">Sẵn sàng dự đoán</h3>
              <p className="text-sm text-muted-foreground max-w-sm mt-1">
                AI sẽ phân tích lịch sử bón phân, phun thuốc (PHI) và thời gian sinh trưởng để đưa ra ngày thu hoạch tối ưu và an toàn nhất.
              </p>
            </div>
            <Button onClick={handlePredict} disabled={isLoading} className="bg-emerald-600 hover:bg-emerald-700 mt-2">
              {isLoading ? "Đang phân tích dữ liệu..." : "Bắt đầu phân tích"}
            </Button>
          </div>
        ) : (
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-lg border border-border p-4 bg-card">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-1">
                  <CalendarDays className="w-4 h-4 text-primary" />
                  Ngày thu hoạch dự kiến
                </div>
                <div className="text-xl font-bold text-foreground">
                  {prediction.predictedHarvestDate}
                </div>
              </div>
              
              <div className="rounded-lg border border-emerald-200 p-4 bg-emerald-50">
                <div className="flex items-center gap-2 text-sm font-medium text-emerald-700 mb-1">
                  <ShieldAlert className="w-4 h-4" />
                  Ngày an toàn (Đã trừ PHI)
                </div>
                <div className="text-xl font-bold text-emerald-700">
                  {prediction.safeHarvestDate}
                </div>
              </div>
            </div>

            <Alert className="bg-amber-50 border-amber-200">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              <AlertTitle className="text-amber-800">Lời khuyên từ AI chuyên gia</AlertTitle>
              <AlertDescription className="text-amber-700 mt-2 whitespace-pre-wrap">
                {prediction.recommendation}
              </AlertDescription>
            </Alert>
            
            <div className="flex justify-end pt-2">
              <Button variant="outline" onClick={() => setIsOpen(false)}>Đóng</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
