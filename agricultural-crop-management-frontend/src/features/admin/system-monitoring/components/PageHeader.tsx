// Page header with date range selector and action buttons

import { Calendar, Filter, Download, Plus } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/shared/ui/select';
import type { DateRange } from '../types';
import { useI18n } from '@/shared/lib/hooks/useI18n';

interface PageHeaderProps {
    dateRange: DateRange;
    setDateRange: (value: DateRange) => void;
    setFilterOpen: (open: boolean) => void;
    setDownloadLogsOpen: (open: boolean) => void;
    setIncidentModalOpen: (open: boolean) => void;
}

export function PageHeader({
    dateRange,
    setDateRange,
    setFilterOpen,
    setDownloadLogsOpen,
    setIncidentModalOpen,
}: PageHeaderProps) {
    const { t } = useI18n();

    return (
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
                <h1 className="mb-1">{t('admin.systemMonitoring.title')}</h1>
                <p className="text-sm text-muted-foreground">
                    {t('admin.systemMonitoring.subtitle')}
                </p>
            </div>
            <div className="flex items-center gap-3">
                <Select value={dateRange} onValueChange={(v: string) => setDateRange(v as DateRange)}>
                    <SelectTrigger className="w-[140px]">
                        <Calendar className="w-4 h-4 mr-2" />
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="today">{t('admin.systemMonitoring.dateRange.today')}</SelectItem>
                        <SelectItem value="24h">{t('admin.systemMonitoring.dateRange.last24h')}</SelectItem>
                        <SelectItem value="7d">{t('admin.systemMonitoring.dateRange.last7d')}</SelectItem>
                        <SelectItem value="30d">{t('admin.systemMonitoring.dateRange.last30d')}</SelectItem>
                    </SelectContent>
                </Select>
                <Button variant="outline" onClick={() => setFilterOpen(true)}>
                    <Filter className="w-4 h-4 mr-2" />
                    {t('common.filter')}
                </Button>
                <Button variant="outline" onClick={() => setDownloadLogsOpen(true)}>
                    <Download className="w-4 h-4 mr-2" />
                    {t('admin.systemMonitoring.actions.exportLogs')}
                </Button>
                <Button onClick={() => setIncidentModalOpen(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    {t('admin.systemMonitoring.actions.createIncident')}
                </Button>
            </div>
        </div>
    );
}
