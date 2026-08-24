// Filter drawer for advanced log filtering

import { Button } from '@/shared/ui/button';
import { Label } from '@/shared/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/shared/ui/select';
import { Separator } from '@/shared/ui/separator';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/shared/ui/sheet';
import type { LogLevel } from '../types';
import { useI18n } from '@/shared/lib/hooks/useI18n';

interface FilterSheetProps {
    filterOpen: boolean;
    setFilterOpen: (open: boolean) => void;
    serviceFilter: string;
    setServiceFilter: (service: string) => void;
    logLevelFilter: LogLevel;
    setLogLevelFilter: (level: LogLevel) => void;
    userFilter: string;
    setUserFilter: (user: string) => void;
    clearFilters: () => void;
}

export function FilterSheet({
    filterOpen,
    setFilterOpen,
    serviceFilter,
    setServiceFilter,
    logLevelFilter,
    setLogLevelFilter,
    userFilter,
    setUserFilter,
    clearFilters,
}: FilterSheetProps) {
    const { t } = useI18n();

    return (
        <Sheet open={filterOpen} onOpenChange={setFilterOpen}>
            <SheetContent>
                <SheetHeader>
                    <SheetTitle>{t('admin.systemMonitoring.filters.title')}</SheetTitle>
                    <SheetDescription>
                        {t('admin.systemMonitoring.filters.description')}
                    </SheetDescription>
                </SheetHeader>
                <div className="mt-6 space-y-6">
                    <div className="space-y-2">
                        <Label>{t('admin.systemMonitoring.filters.service')}</Label>
                        <Select value={serviceFilter} onValueChange={setServiceFilter}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">{t('admin.systemMonitoring.filters.allServices')}</SelectItem>
                                <SelectItem value="database">{t('admin.systemMonitoring.services.database')}</SelectItem>
                                <SelectItem value="api-gateway">{t('admin.systemMonitoring.services.apiGateway')}</SelectItem>
                                <SelectItem value="auth-service">{t('admin.systemMonitoring.services.authService')}</SelectItem>
                                <SelectItem value="file-storage">{t('admin.systemMonitoring.services.fileStorage')}</SelectItem>
                                <SelectItem value="notification">{t('admin.systemMonitoring.services.notification')}</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label>{t('admin.systemMonitoring.filters.logLevel')}</Label>
                        <Select value={logLevelFilter} onValueChange={(v: string) => setLogLevelFilter(v as LogLevel)}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">{t('admin.systemMonitoring.filters.allLevels')}</SelectItem>
                                <SelectItem value="info">{t('admin.systemMonitoring.logLevel.info')}</SelectItem>
                                <SelectItem value="warning">{t('admin.systemMonitoring.logLevel.warning')}</SelectItem>
                                <SelectItem value="error">{t('admin.systemMonitoring.logLevel.error')}</SelectItem>
                                <SelectItem value="security">{t('admin.systemMonitoring.logLevel.security')}</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label>{t('admin.systemMonitoring.filters.user')}</Label>
                        <Select value={userFilter} onValueChange={setUserFilter}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">{t('admin.systemMonitoring.filters.allUsers')}</SelectItem>
                                <SelectItem value="system">{t('admin.systemMonitoring.users.system')}</SelectItem>
                                <SelectItem value="john.doe@farm.com">john.doe@farm.com</SelectItem>
                                <SelectItem value="sarah.miller@farm.com">sarah.miller@farm.com</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <Separator />
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            className="flex-1"
                            onClick={clearFilters}
                        >
                            {t('common.clearAll')}
                        </Button>
                        <Button className="flex-1" onClick={() => setFilterOpen(false)}>
                            {t('admin.systemMonitoring.filters.apply')}
                        </Button>
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    );
}
