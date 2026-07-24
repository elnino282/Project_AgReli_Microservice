import { useI18n } from '@/shared/lib/hooks/useI18n';
import { Badge } from '@/shared/ui/badge';
import { MapPin, Wheat } from 'lucide-react';
import { Farm } from '../types';

interface FarmListProps {
    farms: Farm[];
    selectedFarmId?: number;
    onSelectFarm: (farm: Farm) => void;
    isLoading: boolean;
}

export function FarmList({ farms, selectedFarmId, onSelectFarm, isLoading }: FarmListProps) {
    const { t } = useI18n();

    if (isLoading) {
        return <div className="p-4 text-center">{t('farms.loading')}</div>;
    }

    return (
        <section className="h-full pr-6 border-r">
            <header className="mb-6">
                <h2 className="text-xl font-semibold tracking-tight">{t('farms.myFarms')}</h2>
                <p className="text-sm text-muted-foreground mt-1">{t('farms.manageFarms')}</p>
            </header>
            <div className="space-y-3">
                {farms.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                        {t('farms.empty')}
                    </div>
                ) : (
                    farms.map(farm => (
                        <div
                            key={farm.id}
                            onClick={() => onSelectFarm(farm)}
                            className={`p-4 rounded-lg border cursor-pointer transition-all hover:bg-[var(--portal-surface-muted)] ${
                                selectedFarmId === farm.id ? 'bg-[var(--primary)]/5 border-[var(--primary)] shadow-sm' : 'bg-[var(--portal-surface)]'
                            }`}
                        >
                            <div className="flex justify-between items-start mb-2">
                                <div className="flex items-center gap-2">
                                    <Wheat className="h-4 w-4 text-primary" />
                                    <span className="font-semibold">{farm.farmName}</span>
                                </div>
                                <Badge variant="outline" className={farm.active ? "bg-primary/10 text-primary border-transparent" : "bg-muted text-muted-foreground border-transparent"}>
                                    {farm.active ? t('common.active') : t('common.inactive')}
                                </Badge>
                            </div>
                            
                            <div className="text-sm text-[var(--muted-foreground)] space-y-1">
                                <div className="flex items-center gap-1">
                                    <MapPin className="h-3 w-3" />
                                    <span className="truncate">{farm.wardName}, {farm.provinceName}</span>
                                </div>
                                <div>{t('farms.form.area')}: {farm.area} ha</div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </section>
    );
}



