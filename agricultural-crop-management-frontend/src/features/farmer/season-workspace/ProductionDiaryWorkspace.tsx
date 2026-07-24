import { useParams } from "react-router-dom";
import { useI18n } from "@/shared/lib/hooks/useI18n";
import { useGetProductionDiary } from "@/entities/season/api/generated/season-service";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { AsyncState } from "@/shared/ui/async-state";
import { FileText, Droplets, Wheat, Bug, ClipboardList } from "lucide-react";
import { Badge } from "@/shared/ui/badge";

const getEventIcon = (type?: string) => {
  switch (type) {
    case "IRRIGATION":
    case "WATER":
      return <Droplets className="w-5 h-5 text-blue-500" />;
    case "FERTILIZER":
    case "NUTRIENT":
      return <Droplets className="w-5 h-5 text-green-500" />;
    case "PESTICIDE":
    case "DISEASE":
      return <Bug className="w-5 h-5 text-red-500" />;
    case "HARVEST":
      return <Wheat className="w-5 h-5 text-yellow-500" />;
    case "TASK":
      return <ClipboardList className="w-5 h-5 text-gray-500" />;
    default:
      return <FileText className="w-5 h-5 text-gray-500" />;
  }
};

const getEventColor = (type?: string) => {
  switch (type) {
    case "IRRIGATION":
    case "WATER":
      return "bg-blue-50 border-blue-200 text-blue-700";
    case "FERTILIZER":
    case "NUTRIENT":
      return "bg-green-50 border-green-200 text-green-700";
    case "PESTICIDE":
    case "DISEASE":
      return "bg-red-50 border-red-200 text-red-700";
    case "HARVEST":
      return "bg-yellow-50 border-yellow-200 text-yellow-700";
    case "TASK":
      return "bg-gray-50 border-gray-200 text-gray-700";
    default:
      return "bg-gray-50 border-gray-200 text-gray-700";
  }
};

export function ProductionDiaryWorkspace() {
  const { t } = useI18n();
  const { seasonId } = useParams();
  const seasonIdNumber = Number(seasonId);
  const hasValidSeasonId = Number.isFinite(seasonIdNumber) && seasonIdNumber > 0;

  const { data: response, isLoading, error, refetch } = useGetProductionDiary(
    seasonIdNumber,
    { query: { enabled: hasValidSeasonId } }
  );

  const events = response?.data?.result ?? response?.data?.data ?? [];

  if (!hasValidSeasonId) {
    return <div className="p-4 text-destructive">Invalid Season ID</div>;
  }

  return (
    <div className="space-y-4">
      <Card className="border border-border rounded-xl shadow-sm">
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2">
            <FileText className="w-6 h-6 text-primary" />
            Nhật ký sản xuất hợp nhất
          </CardTitle>
        </CardHeader>
        <CardContent>
          <AsyncState
            isLoading={isLoading}
            error={error as Error}
            onRetry={() => refetch()}
            isEmpty={events.length === 0}
            emptyTitle="Chưa có nhật ký"
            emptyDescription="Nhật ký sản xuất sẽ được tự động tổng hợp từ các hoạt động bón phân, xịt thuốc, tưới nước và thu hoạch của vụ mùa."
          >
            <div className="relative border-l-2 border-border ml-4 space-y-8 pb-4">
              {events.map((event: any, index: number) => (
                <div key={index} className="relative pl-6">
                  <div className="absolute -left-[17px] top-1 bg-background border-2 border-border rounded-full p-1">
                    {getEventIcon(event.eventType)}
                  </div>
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-foreground">
                        {event.eventDate ? new Date(event.eventDate).toLocaleDateString("vi-VN") : "-"}
                      </span>
                      <Badge variant="outline" className={getEventColor(event.eventType)}>
                        {event.eventType || "Hoạt động"}
                      </Badge>
                    </div>
                    <div className="bg-card border border-border rounded-lg p-3 mt-2 shadow-sm">
                      <h4 className="font-medium text-foreground">{event.title || event.eventName || "Ghi nhận hoạt động"}</h4>
                      {event.description && <p className="text-sm text-muted-foreground mt-1">{event.description}</p>}
                      {event.details && (
                        <div className="mt-2 text-xs text-muted-foreground grid grid-cols-2 gap-2">
                          {Object.entries(event.details).map(([key, value]) => (
                            <div key={key}>
                              <span className="font-semibold capitalize">{key.replace(/([A-Z])/g, " $1").trim()}:</span> {String(value)}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </AsyncState>
        </CardContent>
      </Card>
    </div>
  );
}
