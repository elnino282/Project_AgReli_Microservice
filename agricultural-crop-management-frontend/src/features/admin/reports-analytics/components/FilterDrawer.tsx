import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/shared/ui/sheet';
import { Button } from '@/shared/ui/button';
import { Label } from '@/shared/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';
import { Separator } from '@/shared/ui/separator';
import { useI18n } from '@/shared/lib/hooks/useI18n';

interface FilterDrawerProps {
    filterOpen: boolean;
    setFilterOpen: (open: boolean) => void;
    cropFilter: string;
    setCropFilter: (value: string) => void;
    regionFilter: string;
    setRegionFilter: (value: string) => void;
    roleFilter: string;
    setRoleFilter: (value: string) => void;
    handleFilterClear: () => void;
    handleFilterApply: () => void;
}

export const FilterDrawer: React.FC<FilterDrawerProps> = ({
    filterOpen,
    setFilterOpen,
    cropFilter,
    setCropFilter,
    regionFilter,
    setRegionFilter,
    roleFilter,
    setRoleFilter,
    handleFilterClear,
    handleFilterApply,
}) => {
    const { t } = useI18n();

    return (
        <Sheet open={filterOpen} onOpenChange={setFilterOpen}>
            <SheetContent>
                <SheetHeader>
                    <SheetTitle>{t('admin.reportsAnalytics.filterDrawer.title')}</SheetTitle>
                    <SheetDescription>
                        {t('admin.reportsAnalytics.filterDrawer.description')}
                    </SheetDescription>
                </SheetHeader>
                <div className="mt-6 space-y-6">
                    <div className="space-y-2">
                        <Label>{t('admin.reportsAnalytics.filterDrawer.cropType')}</Label>
                        <Select value={cropFilter} onValueChange={setCropFilter}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">{t('admin.reportsAnalytics.filters.allCrops')}</SelectItem>
                                <SelectItem value="tomato">{t('admin.reportsAnalytics.filterDrawer.crops.tomato')}</SelectItem>
                                <SelectItem value="rice">{t('admin.reportsAnalytics.filterDrawer.crops.rice')}</SelectItem>
                                <SelectItem value="wheat">{t('admin.reportsAnalytics.filterDrawer.crops.wheat')}</SelectItem>
                                <SelectItem value="corn">{t('admin.reportsAnalytics.filterDrawer.crops.corn')}</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label>{t('admin.reportsAnalytics.filterDrawer.region')}</Label>
                        <Select value={regionFilter} onValueChange={setRegionFilter}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">{t('admin.reportsAnalytics.filterDrawer.allRegions')}</SelectItem>
                                <SelectItem value="north">{t('admin.reportsAnalytics.filterDrawer.regions.north')}</SelectItem>
                                <SelectItem value="south">{t('admin.reportsAnalytics.filterDrawer.regions.south')}</SelectItem>
                                <SelectItem value="east">{t('admin.reportsAnalytics.filterDrawer.regions.east')}</SelectItem>
                                <SelectItem value="west">{t('admin.reportsAnalytics.filterDrawer.regions.west')}</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label>{t('admin.reportsAnalytics.filterDrawer.userRole')}</Label>
                        <Select value={roleFilter} onValueChange={setRoleFilter}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">{t('admin.farmerManagement.filters.allRoles')}</SelectItem>
                                <SelectItem value="farmer">{t('admin.farmerManagement.roles.farmer')}</SelectItem>
                                <SelectItem value="buyer">{t('admin.buyerManagement.roles.buyer')}</SelectItem>
                                <SelectItem value="admin">{t('admin.reportsAnalytics.userActivity.admins')}</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <Separator />
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            className="flex-1"
                            onClick={handleFilterClear}
                        >
                            {t('common.clearAll')}
                        </Button>
                        <Button className="flex-1" onClick={handleFilterApply}>
                            {t('admin.reportsAnalytics.filterDrawer.apply')}
                        </Button>
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    );
};
