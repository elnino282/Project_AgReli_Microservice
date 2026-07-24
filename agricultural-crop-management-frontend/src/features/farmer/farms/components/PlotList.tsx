import { useI18n } from '@/shared/lib/hooks/useI18n';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/table';
import { AlertCircle } from 'lucide-react';
import { Farm, Plot } from '../types';

interface PlotListProps {
    farm?: Farm;
    plots: Plot[];
    onCreatePlot: () => void;
    isLoading: boolean;
}

export function PlotList({ farm, plots, onCreatePlot, isLoading }: PlotListProps) {
    const { t } = useI18n();
    const getPlotStatusLabel = (status: string) => {
        const knownStatuses = ['IN_USE', 'IDLE', 'AVAILABLE', 'FALLOW', 'MAINTENANCE'];

        return knownStatuses.includes(status)
            ? t(`farms.plotStatuses.${status}`)
            : status;
    };

    if (!farm) {
        return (
            <div className="flex h-full items-center justify-center text-[var(--muted-foreground)]">
                <div className="text-center">
                    <p className="text-lg font-medium">{t('plots.noFarmSelected.title')}</p>
                    <p>{t('plots.noFarmSelected.description')}</p>
                </div>
            </div>
        );
    }

    if (isLoading) {
        return <div className="p-4 text-center">{t('plots.loading')}</div>;
    }

    return (
        <section className="h-full pl-6">
            <header className="mb-6">
                <h2 className="text-xl font-semibold tracking-tight">{farm.farmName} - {t('plots.title')}</h2>
                <p className="text-sm text-muted-foreground mt-1">{t('plots.subtitle')}</p>
            </header>
            <div>
                {/* Warning for inactive farm */}
                {!farm.active && (
                    <div className="mb-4 p-3 bg-[var(--warning)] text-[var(--warning-foreground)] rounded-md flex items-center gap-2 text-sm border-transparent">
                        <AlertCircle className="h-4 w-4" />
                        {t('plots.inactiveFarmWarning')}
                    </div>
                )}

                {plots.length === 0 ? (
                    <div className="text-center py-12 text-[var(--muted-foreground)] border-2 border-dashed border-[var(--border)] rounded-lg">
                        <p>{t('plots.empty')}</p>
                        {farm.active && (
                            <Button variant="link" onClick={onCreatePlot}>{t('plots.createNow')}</Button>
                        )}
                    </div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>{t('plots.table.name')}</TableHead>
                                <TableHead>{t('plots.table.area')}</TableHead>
                                <TableHead>{t('plots.table.soilType')}</TableHead>
                                <TableHead>{t('plots.table.status')}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {plots.map(plot => (
                                <TableRow key={plot.id}>
                                    <TableCell className="font-medium">{plot.plotName}</TableCell>
                                    <TableCell>{plot.area}</TableCell>
                                    <TableCell>{plot.soilType || '-'}</TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className={
                                            plot.status === 'IN_USE' ? 'bg-primary/10 text-primary border-transparent' :
                                            plot.status === 'IDLE' ? 'bg-muted text-muted-foreground border-transparent' : 'bg-secondary text-secondary-foreground border-transparent'
                                        }>
                                            {getPlotStatusLabel(plot.status)}
                                        </Badge>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </div>
        </section>
    );
}



