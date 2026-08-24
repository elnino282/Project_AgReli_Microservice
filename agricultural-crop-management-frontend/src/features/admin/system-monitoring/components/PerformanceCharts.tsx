// Performance visualization charts section

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';
import {
    ResponsiveContainer,
    LineChart,
    Line,
    BarChart,
    Bar,
    PieChart,
    Pie,
    Cell,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip as RechartsTooltip,
    Legend,
} from 'recharts';
import type {
    PerformanceDataPoint,
    ErrorRateDataPoint,
    SlowPageDataPoint,
} from '../types';
import { useI18n } from '@/shared/lib/hooks/useI18n';

interface PerformanceChartsProps {
    cpuMemoryData: PerformanceDataPoint[];
    errorRateData: ErrorRateDataPoint[];
    slowestPagesData: SlowPageDataPoint[];
}

export function PerformanceCharts({
    cpuMemoryData,
    errorRateData,
    slowestPagesData,
}: PerformanceChartsProps) {
    const { t } = useI18n();
    const serviceLabelMap: Record<string, string> = {
        'API Gateway': t('admin.systemMonitoring.services.apiGateway'),
        Database: t('admin.systemMonitoring.services.database'),
        'Auth Service': t('admin.systemMonitoring.services.authService'),
        'File Storage': t('admin.systemMonitoring.services.fileStorage'),
        Other: t('admin.systemMonitoring.services.other'),
    };

    return (
        <>
            {/* Performance Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* CPU/Memory Chart */}
                <Card className="lg:col-span-2">
                    <CardHeader>
                        <CardTitle>{t('admin.systemMonitoring.performance.cpuMemoryTitle')}</CardTitle>
                        <CardDescription>{t('admin.systemMonitoring.performance.cpuMemoryDescription')}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                            <LineChart data={cpuMemoryData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                <XAxis dataKey="time" stroke="#6b7280" />
                                <YAxis stroke="#6b7280" />
                                <RechartsTooltip />
                                <Legend />
                                <Line
                                    type="monotone"
                                    dataKey="cpu"
                                    stroke="#3BA55D"
                                    strokeWidth={2}
                                    dot={{ r: 4 }}
                                    name={t('admin.systemMonitoring.performance.cpuPercent')}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="memory"
                                    stroke="#10B981"
                                    strokeWidth={2}
                                    dot={{ r: 4 }}
                                    name={t('admin.systemMonitoring.performance.memoryPercent')}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                {/* Error Rate Donut */}
                <Card>
                    <CardHeader>
                        <CardTitle>{t('admin.systemMonitoring.performance.errorRateTitle')}</CardTitle>
                        <CardDescription>{t('admin.systemMonitoring.performance.errorRateDescription')}</CardDescription>
                    </CardHeader>
                    <CardContent className="flex items-center justify-center">
                        <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                                <Pie
                                    data={errorRateData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={100}
                                    paddingAngle={5}
                                    dataKey="value"
                                    label={(entry) => serviceLabelMap[entry.service] ?? entry.service}
                                >
                                    {errorRateData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <RechartsTooltip />
                            </PieChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>

            {/* Slowest Pages Bar Chart */}
            <Card>
                <CardHeader>
                    <CardTitle>{t('admin.systemMonitoring.performance.slowestEndpointsTitle')}</CardTitle>
                    <CardDescription>{t('admin.systemMonitoring.performance.slowestEndpointsDescription')}</CardDescription>
                </CardHeader>
                <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={slowestPagesData} layout="horizontal">
                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                            <XAxis type="number" stroke="#6b7280" />
                            <YAxis dataKey="page" type="category" width={200} stroke="#6b7280" />
                            <RechartsTooltip />
                            <Legend />
                            <Bar dataKey="latency" fill="#F59E0B" name={t('admin.systemMonitoring.performance.avgLatency')} radius={[0, 8, 8, 0]} />
                            <Bar dataKey="p95" fill="#EF4444" name={t('admin.systemMonitoring.performance.p95')} radius={[0, 8, 8, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>
        </>
    );
}
