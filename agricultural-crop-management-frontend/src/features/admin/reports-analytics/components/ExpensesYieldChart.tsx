import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';
import {
    ResponsiveContainer,
    BarChart,
    Bar,
    CartesianGrid,
    XAxis,
    YAxis,
    Tooltip as RechartsTooltip,
    Legend,
} from 'recharts';
import { usePreferences } from '@/shared/contexts';
import { convertWeight, formatMoney, getWeightUnitLabel } from '@/shared/lib';
import type { ExpensesData } from '../types';
import { useI18n } from '@/shared/lib/hooks/useI18n';

interface ExpensesYieldChartProps {
    expensesData: ExpensesData[];
}

export const ExpensesYieldChart: React.FC<ExpensesYieldChartProps> = ({ expensesData }) => {
    const { t } = useI18n();
    const { preferences } = usePreferences();
    const unitLabel = getWeightUnitLabel(preferences.weightUnit);
    const displayData = expensesData.map((item) => ({
        ...item,
        yield: convertWeight(item.yield, preferences.weightUnit),
    }));

    return (
        <Card>
            <CardHeader>
                <CardTitle>{t('admin.reportsAnalytics.expensesYield.title')}</CardTitle>
                <CardDescription>{t('admin.reportsAnalytics.expensesYield.description')}</CardDescription>
            </CardHeader>
            <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={displayData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis dataKey="season" stroke="#6b7280" />
                        <YAxis yAxisId="left" stroke="#6b7280" />
                        <YAxis yAxisId="right" orientation="right" stroke="#6b7280" />
                        <RechartsTooltip
                            formatter={(value: number, name: string) => {
                                if (name === 'expenses') {
                                    return [
                                        formatMoney(value, preferences.currency, preferences.locale),
                                        t('admin.reportsAnalytics.expensesYield.expenses')
                                    ];
                                }
                                if (name === 'yield') {
                                    return [
                                        new Intl.NumberFormat(preferences.locale).format(value),
                                        t('admin.reportsAnalytics.chart.yieldWithUnit', { unit: unitLabel })
                                    ];
                                }
                                return [value, name];
                            }}
                        />
                        <Legend />
                        <Bar
                            yAxisId="left"
                            dataKey="expenses"
                            fill="#F59E0B"
                            name={t('admin.reportsAnalytics.expensesYield.expensesWithCurrency', { currency: preferences.currency })}
                            radius={[8, 8, 0, 0]}
                        />
                        <Bar
                            yAxisId="right"
                            dataKey="yield"
                            fill="#10B981"
                            name={t('admin.reportsAnalytics.chart.yieldWithUnit', { unit: unitLabel })}
                            radius={[8, 8, 0, 0]}
                        />
                    </BarChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    );
};
