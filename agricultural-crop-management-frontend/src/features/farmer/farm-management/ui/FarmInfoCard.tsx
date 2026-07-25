import type { FarmDetailResponse } from '@/entities/farm';
import { AddressDisplay, Badge, Button, Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface FarmInfoCardProps {
    farm: FarmDetailResponse;
    canEdit: boolean;
    canDelete: boolean;
    onEdit: () => void;
    onDelete: () => void;
    onCreatePlot: () => void;
}

/**
 * Farm information card component
 */
export function FarmInfoCard({
    farm,
    canEdit,
    canDelete,
    onEdit,
    onDelete,
    onCreatePlot,
}: FarmInfoCardProps) {
    const { t } = useTranslation();

    return (
        <div className="py-2 space-y-8 mb-4">
            <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-foreground">{farm.name}</h1>
                    <div className="mt-3 flex items-center gap-3">
                        <span className="text-muted-foreground text-sm">{t('farmDetail.farmId', { id: farm.id })}</span>
                        <div className="h-4 w-px bg-border"></div>
                        <Badge variant={farm.active ? 'default' : 'secondary'} className="font-medium px-2.5 py-0.5 rounded-md">
                            {farm.active ? t('farmDetail.overview.active') : t('farmDetail.overview.inactive')}
                        </Badge>
                    </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    {canEdit && (
                        <Button variant="ghost" onClick={onEdit} className="text-muted-foreground hover:text-foreground">
                            <Pencil className="h-4 w-4 mr-2" />
                            {t('common.edit')}
                        </Button>
                    )}
                    {canDelete && (
                        <Button variant="ghost" onClick={onDelete} className="text-muted-foreground hover:text-destructive hover:bg-destructive/10">
                            <Trash2 className="h-4 w-4 mr-2" />
                            {t('common.delete')}
                        </Button>
                    )}
                    <Button
                        variant="default"
                        onClick={onCreatePlot}
                        disabled={!farm.active}
                        className="shadow-sm bg-emerald-600 hover:bg-emerald-700 text-white ml-2"
                    >
                        <Plus className="h-4 w-4 mr-2" />
                        {t('farms.dialog.createPlotTitle')}
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 pt-6 border-t border-border/40">
                <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1.5">{t('farmDetail.overview.owner')}</p>
                    <p className="text-base font-medium">@{farm.ownerUsername}</p>
                </div>
                <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1.5">{t('farms.form.area')}</p>
                    <p className="text-base font-mono">
                        {farm.area ? `${farm.area} ha` : t('farmDetail.overview.notSpecified')}
                    </p>
                </div>
                <div className="col-span-2 md:col-span-1">
                    <p className="text-sm font-medium text-muted-foreground mb-1.5">{t('farmDetail.stock.table.location')}</p>
                    <div className="text-base">
                        <AddressDisplay
                            wardCode={farm.wardId}
                            variant="full"
                            showIcon={true}
                            fallback={t('farmDetail.overview.notSpecified')}
                        />
                    </div>
                </div>
                <div className="flex gap-10">
                    {farm.totalPlots !== undefined && (
                        <div>
                            <p className="text-sm font-medium text-muted-foreground mb-1.5">{t('farmDetail.overview.totalPlots')}</p>
                            <p className="text-base font-mono">{farm.totalPlots}</p>
                        </div>
                    )}
                    {farm.activePlots !== undefined && (
                        <div>
                            <p className="text-sm font-medium text-muted-foreground mb-1.5">{t('farmDetail.overview.activePlots')}</p>
                            <p className="text-base font-mono">{farm.activePlots}</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}



