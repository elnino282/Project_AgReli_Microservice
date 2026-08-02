import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Calendar,
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
  TrendingUp,
  DollarSign,
  Package,
  Sprout,
  Tractor,
  ThermometerSun,
  ClipboardList,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

import { PageContainer } from '@/shared/ui';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/shared/ui/card';
import { AiHarvestPredictionModal } from "./components/AiHarvestPredictionModal";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select';
import { Badge } from '@/shared/ui/badge';
import { formatMoney } from '@/shared/lib';
import { DataErrorBoundary } from '@/shared/ui/error-boundary/DataErrorBoundary';

// Import Types & Hook
import { FarmingLog, ReportData } from '@/features/farmer/dashboard/types/dashboard-types';
import { FarmingLogsWidget } from '@/features/farmer/dashboard/components/FarmingLogsWidget';
import { SeasonAnalyticsWidget } from '@/features/farmer/dashboard/components/SeasonAnalyticsWidget';
import { useSeason } from '@/shared/contexts';
import { SelectGroup, SelectLabel } from '@/shared/ui/select';

export function FarmerDashboardPage() {
  const { t } = useTranslation();
  const { seasons, activeSeasons, isLoading, error } = useSeason();

  // 1. HEADER / TOP (Active Seasons)
  const [selectedSeasonId, setSelectedSeasonId] = useState<number | null>(null);

  useEffect(() => {
    if (!selectedSeasonId && seasons && seasons.length > 0) {
      if (activeSeasons && activeSeasons.length > 0) {
        setSelectedSeasonId(activeSeasons[0].id);
      } else {
        const completedSeason = seasons.find(s => s.status === 'COMPLETED');
        if (completedSeason) {
          setSelectedSeasonId(completedSeason.id);
        } else {
          setSelectedSeasonId(seasons[0].id);
        }
      }
    }
  }, [seasons, activeSeasons, selectedSeasonId]);

  const activeSeason = useMemo(() => {
    return seasons?.find((s: any) => s.id === selectedSeasonId);
  }, [seasons, selectedSeasonId]);

  const completedSeasons = useMemo(() => {
    return seasons?.filter((s: any) => s.status === 'COMPLETED') || [];
  }, [seasons]);

  // Utility for status icon & color
  const getStatusConfig = (status: FarmingLog['status']) => {
    switch (status) {
      case 'COMPLETED':
        return { icon: <CheckCircle2 className="w-4 h-4 mr-1" />, color: 'bg-green-100 text-green-800 border-green-200' };
      case 'PENDING':
        return { icon: <Clock className="w-4 h-4 mr-1" />, color: 'bg-yellow-100 text-yellow-800 border-yellow-200' };
      case 'CANCELLED':
        return { icon: <XCircle className="w-4 h-4 mr-1" />, color: 'bg-red-100 text-red-800 border-red-200' };
      default:
        return { icon: <AlertCircle className="w-4 h-4 mr-1" />, color: 'bg-gray-100 text-gray-800 border-gray-200' };
    }
  };

  const getActivityLabel = (type: FarmingLog['activityType']) => {
    switch (type) {
      case 'FERTILIZER': return 'Bón phân';
      case 'PESTICIDE': return 'Xịt thuốc';
      case 'WATERING': return 'Tưới nước';
      case 'HARVEST': return 'Thu hoạch';
      case 'OTHER': return 'Khác';
      default: return 'Khác';
    }
  };

  const COLORS = ['#10b981', '#f59e0b', '#3b82f6', '#8b5cf6', '#ec4899'];

  return (
    <PageContainer>
      <div className="flex flex-col gap-6 w-full max-w-[1400px] mx-auto min-h-screen">
        
        {/* ================= HEADER ================= */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shrink-0">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <Sprout className="w-6 h-6 text-primary" />
              Tổng quan Nông trại
            </h1>
            <p className="text-muted-foreground mt-1">
              Theo dõi và quản lý các hoạt động canh tác hàng ngày.
            </p>
          </div>

          <div className="w-full md:w-72">
            <Select 
              value={selectedSeasonId ? String(selectedSeasonId) : undefined} 
              onValueChange={(val) => setSelectedSeasonId(Number(val))}
            >
              <SelectTrigger className="w-full bg-card">
                <SelectValue placeholder="Chọn mùa vụ..." />
              </SelectTrigger>
              <SelectContent>
                {activeSeasons && activeSeasons.length > 0 && (
                  <SelectGroup>
                    <SelectLabel>Đang sản xuất</SelectLabel>
                    {activeSeasons.map((season: any) => (
                      <SelectItem key={season.id} value={String(season.id)}>
                        {season.seasonName} ({season.cropName})
                      </SelectItem>
                    ))}
                  </SelectGroup>
                )}
                {completedSeasons && completedSeasons.length > 0 && (
                  <SelectGroup>
                    <SelectLabel>Đã thu hoạch</SelectLabel>
                    {completedSeasons.map((season: any) => (
                      <SelectItem key={season.id} value={String(season.id)}>
                        {season.seasonName} ({season.cropName})
                      </SelectItem>
                    ))}
                  </SelectGroup>
                )}
              </SelectContent>
            </Select>
          </div>
        </div>

        {activeSeason && (
          <div className="flex flex-col gap-4">
            <div className="flex justify-end shrink-0">
              <AiHarvestPredictionModal 
                seasonName={activeSeason.cropName} 
                plantingDate={activeSeason.startDate} 
                expectedGrowthDays={75}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 shrink-0">
            <Card className="bg-card shadow-sm border-border/50">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2.5 bg-primary/10 rounded-lg text-primary">
                  <Tractor className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Nông trại</p>
                  <p className="font-semibold text-foreground line-clamp-1">{activeSeason.farmName}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-card shadow-sm border-border/50">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2.5 bg-blue-500/10 rounded-lg text-blue-600">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Bắt đầu</p>
                  <p className="font-semibold text-foreground">{activeSeason.startDate ? new Date(activeSeason.startDate).toLocaleDateString('vi-VN') : '---'}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-card shadow-sm border-border/50">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2.5 bg-emerald-500/10 rounded-lg text-emerald-600">
                  <ThermometerSun className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Dự kiến thu hoạch</p>
                  <p className="font-semibold text-foreground">{activeSeason.plannedHarvestDate ? new Date(activeSeason.plannedHarvestDate).toLocaleDateString('vi-VN') : '---'}</p>
                </div>
              </CardContent>
            </Card>
          </div>
          </div>
        )}

        {/* ================= BODY (HOT DATA) ================= */}
        <Card className="flex-1 flex flex-col min-h-[400px] border-border shadow-sm bg-card overflow-hidden">
          <CardHeader className="border-b border-border/50 bg-muted/20 shrink-0">
            <CardTitle className="text-lg flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-primary" />
              Nhật ký canh tác thực tế
            </CardTitle>
            <CardDescription>
              Các hoạt động canh tác gần nhất trong mùa vụ hiện tại
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0 flex-1 overflow-y-auto bg-slate-50/50">
            {selectedSeasonId && (
              <DataErrorBoundary fallbackMessage="Không thể tải nhật ký canh tác lúc này.">
                <FarmingLogsWidget seasonId={selectedSeasonId} />
              </DataErrorBoundary>
            )}
          </CardContent>
        </Card>

        {/* ================= FOOTER (COLD DATA) ================= */}
        {selectedSeasonId && (
          <div className="shrink-0">
            <DataErrorBoundary fallbackMessage="Không thể tải báo cáo thống kê lúc này.">
              <SeasonAnalyticsWidget seasonId={selectedSeasonId} />
            </DataErrorBoundary>
          </div>
        )}
        
      </div>
    </PageContainer>
  );
}
