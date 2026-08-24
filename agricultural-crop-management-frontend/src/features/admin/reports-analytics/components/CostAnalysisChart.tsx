import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { Skeleton } from '@/shared/ui/skeleton';
import { usePreferences } from '@/shared/contexts';
import {
    convertCostPerKg,
    convertWeight,
    formatMoney,
    getWeightUnitLabel,
} from '@/shared/lib';
import type { CostReport } from '@/entities/user/api/api.admin';
import { useI18n } from '@/shared/lib/hooks/useI18n';

interface CostAnalysisChartProps {
    data: CostReport[];
    isLoading?: boolean;
}

export const CostAnalysisChart: React.FC<CostAnalysisChartProps> = ({ data, isLoading }) => {
    const { t } = useI18n();
    const { preferences } = usePreferences();
    const unitLabel = getWeightUnitLabel(preferences.weightUnit);
    const formatNumber = (value: number) => new Intl.NumberFormat(preferences.locale).format(value);

    // Transform data for the chart
    const chartData = data.map(item => ({
        name: item.seasonName || t('admin.reportsAnalytics.fallback.season', { id: item.seasonId }),
        expense: Number(item.totalExpense) || 0,
        costPerUnit: convertCostPerKg(Number(item.costPerKg) || 0, preferences.weightUnit),
        yield: convertWeight(Number(item.totalYieldKg) || 0, preferences.weightUnit),
    }));

    if (isLoading) {
        return (
            <Card className="col-span-2">
                <CardHeader>
                    <CardTitle>{t('admin.reportsAnalytics.costAnalysis.title')}</CardTitle>
                </CardHeader>
                <CardContent>
                    <Skeleton className="h-[300px] w-full" />
                </CardContent>
            </Card>
        );
    }

    if (!data || data.length === 0) {
        return (
            <Card className="col-span-2">
                <CardHeader>
                    <CardTitle>{t('admin.reportsAnalytics.costAnalysis.title')}</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                        <p>{t('admin.reportsAnalytics.costAnalysis.empty')}</p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="col-span-2">
            <CardHeader>
                <CardTitle>{t('admin.reportsAnalytics.costAnalysis.bySeason')}</CardTitle>
            </CardHeader>
            <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis
                            dataKey="name"
                            tick={{ fontSize: 12 }}
                            angle={-20}
                            textAnchor="end"
                            height={60}
                        />
                        <YAxis
                            yAxisId="left"
                            tick={{ fontSize: 12 }}
                            tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                        />
                        <YAxis
                            yAxisId="right"
                            orientation="right"
                            tick={{ fontSize: 12 }}
                            tickFormatter={(value) => `${formatNumber(value as number)}/${unitLabel}`}
                        />
                        <Tooltip
                            formatter={(value: number, name: string) => {
                                if (name === 'expense') {
                                    return [formatMoney(value, preferences.currency, preferences.locale), t('admin.reportsAnalytics.costAnalysis.totalExpense')];
                                }
                                if (name === 'costPerUnit') {
                                    return [
                                        `${formatMoney(value, preferences.currency, preferences.locale)}/${unitLabel}`,
                                        t('admin.reportsAnalytics.costAnalysis.costPerUnit', { unit: unitLabel })
                                    ];
                                }
                                return [value, name];
                            }}
                        />
                        <Legend />
                        <Bar
                            yAxisId="left"
                            dataKey="expense"
                            name={t('admin.reportsAnalytics.costAnalysis.totalExpense')}
                            fill="#F59E0B"
                            radius={[4, 4, 0, 0]}
                        />
                        <Bar
                            yAxisId="right"
                            dataKey="costPerUnit"
                            name={t('admin.reportsAnalytics.costAnalysis.costPerUnitShort', { unit: unitLabel })}
                            fill="#3BA55D"
                            radius={[4, 4, 0, 0]}
                        />
                    </BarChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    );
};
