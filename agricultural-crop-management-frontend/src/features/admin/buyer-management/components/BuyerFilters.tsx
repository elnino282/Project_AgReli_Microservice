import { Search, Filter } from 'lucide-react';
import { Card, CardContent } from '@/shared/ui/card';
import { Input } from '@/shared/ui/input';
import { Button } from '@/shared/ui/button';
import { Badge } from '@/shared/ui/badge';
import { Label } from '@/shared/ui/label';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/shared/ui/sheet';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';
import { Separator } from '@/shared/ui/separator';
import type { BuyerRole, KYCStatus, AccountStatus } from '../types';
import { useI18n } from '@/shared/lib/hooks/useI18n';

interface BuyerFiltersProps {
    searchQuery: string;
    onSearchChange: (value: string) => void;
    filterOpen: boolean;
    onFilterOpenChange: (open: boolean) => void;
    roleFilter: BuyerRole | 'all';
    onRoleFilterChange: (value: BuyerRole | 'all') => void;
    kycFilter: KYCStatus | 'all';
    onKycFilterChange: (value: KYCStatus | 'all') => void;
    statusFilter: AccountStatus | 'all';
    onStatusFilterChange: (value: AccountStatus | 'all') => void;
}

export function BuyerFilters({
    searchQuery,
    onSearchChange,
    filterOpen,
    onFilterOpenChange,
    roleFilter,
    onRoleFilterChange,
    kycFilter,
    onKycFilterChange,
    statusFilter,
    onStatusFilterChange,
}: BuyerFiltersProps) {
    const { t } = useI18n();
    const activeFilterCount =
        (roleFilter !== 'all' ? 1 : 0) +
        (kycFilter !== 'all' ? 1 : 0) +
        (statusFilter !== 'all' ? 1 : 0);

    const clearAllFilters = () => {
        onRoleFilterChange('all');
        onKycFilterChange('all');
        onStatusFilterChange('all');
    };

    return (
        <Card>
            <CardContent className="p-4">
                <div className="flex flex-col md:flex-row gap-3">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                            placeholder={t('admin.buyerManagement.filters.searchPlaceholder')}
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
                            {activeFilterCount > 0 && (
                                <Badge variant="secondary" className="ml-2">
                                    {activeFilterCount}
                                </Badge>
                            )}
                        </Button>
                        <SheetContent>
                            <SheetHeader>
                                <SheetTitle>{t('admin.buyerManagement.filters.title')}</SheetTitle>
                                <SheetDescription>{t('admin.buyerManagement.filters.description')}</SheetDescription>
                            </SheetHeader>
                            <div className="mt-6 space-y-6">
                                <div className="space-y-2">
                                    <Label>{t('admin.buyerManagement.fields.role')}</Label>
                                    <Select value={roleFilter} onValueChange={(v) => onRoleFilterChange(v as any)}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">{t('admin.buyerManagement.filters.allRoles')}</SelectItem>
                                            <SelectItem value="buyer">{t('admin.buyerManagement.roles.buyer')}</SelectItem>
                                            <SelectItem value="enterprise">{t('admin.buyerManagement.roles.enterprise')}</SelectItem>
                                            <SelectItem value="distributor">{t('admin.buyerManagement.roles.distributor')}</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>{t('admin.buyerManagement.fields.kycStatus')}</Label>
                                    <Select value={kycFilter} onValueChange={(v) => onKycFilterChange(v as any)}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">{t('admin.buyerManagement.filters.allKycStatuses')}</SelectItem>
                                            <SelectItem value="pending">{t('admin.buyerManagement.kyc.pending')}</SelectItem>
                                            <SelectItem value="verified">{t('admin.buyerManagement.kyc.verified')}</SelectItem>
                                            <SelectItem value="rejected">{t('admin.buyerManagement.kyc.rejected')}</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>{t('admin.buyerManagement.fields.accountStatus')}</Label>
                                    <Select value={statusFilter} onValueChange={(v) => onStatusFilterChange(v as any)}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">{t('admin.buyerManagement.filters.allStatuses')}</SelectItem>
                                            <SelectItem value="active">{t('admin.buyerManagement.status.active')}</SelectItem>
                                            <SelectItem value="suspended">{t('admin.buyerManagement.status.suspended')}</SelectItem>
                                            <SelectItem value="closed">{t('admin.buyerManagement.status.closed')}</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <Separator />
                                <div className="flex gap-2">
                                    <Button variant="outline" className="flex-1" onClick={clearAllFilters}>
                                        {t('common.clearAll')}
                                    </Button>
                                    <Button className="flex-1" onClick={() => onFilterOpenChange(false)}>
                                        {t('admin.buyerManagement.filters.apply')}
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
