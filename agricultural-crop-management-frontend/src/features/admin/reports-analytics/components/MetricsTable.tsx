import { Download, TrendingUp, TrendingDown } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/shared/ui/table';
import type { MetricData } from '../types';
import { useI18n } from '@/shared/lib/hooks/useI18n';

interface MetricsTableProps {
    metricsData: MetricData[];
}

export const MetricsTable: React.FC<MetricsTableProps> = ({ metricsData }) => {
    const { t } = useI18n();

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle>{t('admin.reportsAnalytics.metrics.title')}</CardTitle>
                        <CardDescription>{t('admin.reportsAnalytics.metrics.description')}</CardDescription>
                    </div>
                    <Button variant="outline" size="sm">
                        <Download className="w-4 h-4 mr-2" />
                        {t('admin.reportsAnalytics.metrics.exportTable')}
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="p-0">
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>{t('admin.reportsAnalytics.metrics.table.module')}</TableHead>
                                <TableHead>{t('admin.reportsAnalytics.metrics.table.metric')}</TableHead>
                                <TableHead>{t('admin.reportsAnalytics.metrics.table.value')}</TableHead>
                                <TableHead>{t('admin.reportsAnalytics.metrics.table.change')}</TableHead>
                                <TableHead>{t('admin.reportsAnalytics.metrics.table.lastUpdated')}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {metricsData.map((metric) => (
                                <TableRow key={metric.id}>
                                    <TableCell className="font-medium">{metric.module}</TableCell>
                                    <TableCell>{metric.metric}</TableCell>
                                    <TableCell className="font-numeric">{metric.value}</TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-1">
                                            {metric.change >= 0 ? (
                                                <TrendingUp className="w-4 h-4 text-emerald-600" />
                                            ) : (
                                                <TrendingDown className="w-4 h-4 text-red-600" />
                                            )}
                                            <span className={metric.change >= 0 ? 'text-emerald-600' : 'text-red-600'}>
                                                {Math.abs(metric.change)}%
                                            </span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-sm text-muted-foreground">
                                        {metric.lastUpdated}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    );
};
