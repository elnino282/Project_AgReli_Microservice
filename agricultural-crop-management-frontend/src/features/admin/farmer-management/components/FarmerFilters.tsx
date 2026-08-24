import { Search, Filter } from 'lucide-react';
import { Card, CardContent } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Badge } from '@/shared/ui/badge';
import { Label } from '@/shared/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/shared/ui/select';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/shared/ui/sheet';
import { Separator } from '@/shared/ui/separator';
import { FarmerRole, FarmerStatus } from '../types';
import { useI18n } from '@/shared/lib/hooks/useI18n';

interface FarmerFiltersProps {
    searchQuery: string;
    onSearchChange: (query: string) => void;
    filterOpen: boolean;
    onFilterOpenChange: (open: boolean) => void;
    roleFilter: FarmerRole | 'all';
    statusFilter: FarmerStatus | 'all';
    onRoleFilterChange: (role: FarmerRole | 'all') => void;
    onStatusFilterChange: (status: FarmerStatus | 'all') => void;
    onClearFilters: () => void;
}

export function FarmerFilters({
    searchQuery,
    onSearchChange,
    filterOpen,
    onFilterOpenChange,
    roleFilter,
    statusFilter,
    onRoleFilterChange,
    onStatusFilterChange,
    onClearFilters,
}: FarmerFiltersProps) {
    const { t } = useI18n();
    const activeFiltersCount =
        (roleFilter !== 'all' ? 1 : 0) + (statusFilter !== 'all' ? 1 : 0);

    return (
        <Card>
            <CardContent className="p-4">
                <div className="flex flex-col md:flex-row gap-3">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                            placeholder={t('admin.farmerManagement.filters.searchPlaceholder')}
                            value={searchQuery}
                            onChange={(e) => onSearchChange(e.target.value)}
                            className="pl-9"
                        />
                    </div>
                    <Sheet open={filterOpen} onOpenChange={onFilterOpenChange}>
                        <Button
                            variant="outline"
                            onClick={() => onFilterOpenChange(true)}
                            className="w-full md:w-auto"
                        >
                            <Filter className="w-4 h-4 mr-2" />
                            {t('common.filter')}
                            {activeFiltersCount > 0 && (
                                <Badge variant="secondary" className="ml-2">
                                    {activeFiltersCount}
                                </Badge>
                            )}
                        </Button>
                        <SheetContent>
                            <SheetHeader>
                                <SheetTitle>{t('admin.farmerManagement.filters.title')}</SheetTitle>
                                <SheetDescription>
                                    {t('admin.farmerManagement.filters.description')}
                                </SheetDescription>
                            </SheetHeader>
                            <div className="mt-6 space-y-6">
                                <div className="space-y-2">
                                    <Label>{t('admin.farmerManagement.fields.role')}</Label>
                                    <Select value={roleFilter} onValueChange={(v) => onRoleFilterChange(v as FarmerRole | 'all')}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">{t('admin.farmerManagement.filters.allRoles')}</SelectItem>
                                            <SelectItem value="owner">{t('admin.farmerManagement.roles.owner')}</SelectItem>
                                            <SelectItem value="manager">{t('admin.farmerManagement.roles.manager')}</SelectItem>
                                            <SelectItem value="farmer">{t('admin.farmerManagement.roles.farmer')}</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>{t('common.status')}</Label>
                                    <Select value={statusFilter} onValueChange={(v) => onStatusFilterChange(v as FarmerStatus | 'all')}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">{t('admin.farmerManagement.filters.allStatuses')}</SelectItem>
                                            <SelectItem value="active">{t('admin.farmerManagement.status.active')}</SelectItem>
                                            <SelectItem value="locked">{t('admin.farmerManagement.status.locked')}</SelectItem>
                                            <SelectItem value="inactive">{t('admin.farmerManagement.status.inactive')}</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <Separator />
                                <div className="flex gap-2">
                                    <Button
                                        variant="outline"
                                        className="flex-1"
                                        onClick={onClearFilters}
                                    >
                                        {t('common.clearAll')}
                                    </Button>
                                    <Button className="flex-1" onClick={() => onFilterOpenChange(false)}>
                                        {t('admin.farmerManagement.filters.apply')}
                                    </Button>
                                </div>
                            </div>
                        </SheetContent>
                    </Sheet>
                </div>
            </CardContent>
        </Card>
    );
}
