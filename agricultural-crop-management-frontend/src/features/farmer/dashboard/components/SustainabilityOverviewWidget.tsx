import { useDashboardFdnOverview } from '@/entities/dashboard';
import { fdnLevelBadgeClassName, metricStatusClassName } from '@/features/farmer/dashboard/lib/metrics';
import { Alert, AlertDescription, AlertTitle } from '@/shared/ui/alert';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';
import { AlertCircle, Beaker, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';

interface SustainabilityOverviewWidgetProps {
  seasonId: number;
}

const formatMetric = (value: number | null | undefined, unit?: string) => {
  if (value === null || value === undefined) return 'Chưa đủ dữ liệu';
  const formatted = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 2 }).format(value);
  return unit ? `${formatted} ${unit}` : formatted;
};

export function SustainabilityOverviewWidget({ seasonId }: SustainabilityOverviewWidgetProps) {
  const query = useDashboardFdnOverview(
    { scope: 'farm' },
    { enabled: Number.isFinite(seasonId) && seasonId > 0 },
  );

  if (query.isLoading) {
    return (
      <Card aria-label="Đang tải hiệu quả sử dụng đạm">
        <CardContent className="flex min-h-32 items-center justify-center gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          Đang tải chỉ số bền vững…
        </CardContent>
      </Card>
    );
  }

  if (query.error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Không thể tải chỉ số bền vững</AlertTitle>
        <AlertDescription className="flex flex-wrap items-center justify-between gap-3">
          <span>{query.error.message}</span>
          <Button variant="outline" size="sm" onClick={() => query.refetch()}>
            Thử lại
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  const overview = query.data;
  if (!overview) return null;

  const missingInputs = overview.missingInputs ?? [];
  const recommendations = overview.recommendations ?? [];

  return (
    <Card className="border-border shadow-sm">
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Beaker className="h-5 w-5 text-primary" />
              Hiệu quả sử dụng đạm (FDN)
            </CardTitle>
            <CardDescription>Số liệu tính từ dữ liệu đất, nước, dinh dưỡng và thu hoạch đã lưu.</CardDescription>
          </div>
          <Badge className={fdnLevelBadgeClassName(overview.fdn.level)}>
            Mức {overview.fdn.level}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className={`rounded-xl border p-3 ${metricStatusClassName(overview.fdnTotalMetric.status)}`}>
            <p className="text-xs font-medium">FDN tổng</p>
            <p className="mt-1 text-lg font-semibold">{formatMetric(overview.fdn.total, overview.unit)}</p>
          </div>
          <div className={`rounded-xl border p-3 ${metricStatusClassName(overview.nueMetric.status)}`}>
            <p className="text-xs font-medium">NUE</p>
            <p className="mt-1 text-lg font-semibold">{formatMetric(overview.nue, '%')}</p>
          </div>
          <div className={`rounded-xl border p-3 ${metricStatusClassName(overview.nSurplusMetric.status)}`}>
            <p className="text-xs font-medium">Dư lượng N</p>
            <p className="mt-1 text-lg font-semibold">{formatMetric(overview.nSurplus, overview.unit)}</p>
          </div>
          <div className="rounded-xl border border-border bg-muted/30 p-3">
            <p className="text-xs font-medium text-muted-foreground">Độ tin cậy</p>
            <p className="mt-1 text-lg font-semibold">
              {overview.confidence === null ? 'Chưa xác định' : formatMetric(overview.confidence, '%')}
            </p>
          </div>
        </div>

        {missingInputs.length > 0 && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Chưa đủ dữ liệu để tính chính xác</AlertTitle>
            <AlertDescription>{missingInputs.join(', ')}</AlertDescription>
          </Alert>
        )}

        {recommendations.length > 0 && (
          <div className="rounded-xl border border-border bg-muted/20 p-4">
            <p className="text-sm font-semibold">Khuyến nghị từ dữ liệu hiện tại</p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
              {recommendations.slice(0, 3).map((recommendation) => (
                <li key={recommendation}>{recommendation}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm">
            <Link to={`/farmer/seasons/${seasonId}/workspace/nutrient-inputs`}>Nhập dinh dưỡng</Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link to={`/farmer/seasons/${seasonId}/workspace/irrigation-water-analyses`}>Phân tích nước</Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link to={`/farmer/seasons/${seasonId}/workspace/soil-tests`}>Kiểm tra đất</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
