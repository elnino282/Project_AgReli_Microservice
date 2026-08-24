import { AlertCircle, Clock } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';
import { Badge } from '@/shared/ui/badge';
import type { SystemAlert } from '../types';
import { useI18n } from '@/shared/lib/hooks/useI18n';

interface RecentAlertsCardProps {
    systemAlerts: SystemAlert[];
    getAlertIcon: (type: SystemAlert['type']) => React.ReactNode;
    getAlertBadge: (severity: SystemAlert['severity']) => string;
}

export const RecentAlertsCard: React.FC<RecentAlertsCardProps> = ({
    systemAlerts,
    getAlertIcon,
    getAlertBadge,
}) => {
    const { t } = useI18n();

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <AlertCircle className="w-5 h-5" />
                    {t('admin.reportsAnalytics.alerts.title')}
                </CardTitle>
                <CardDescription>{t('admin.reportsAnalytics.alerts.description')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
                {systemAlerts.map((alert) => (
                    <div
                        key={alert.id}
                        className="flex gap-3 p-3 rounded-lg border bg-card hover:bg-muted/30 transition-colors"
                    >
                        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                            {getAlertIcon(alert.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2 mb-1">
                                <p className="text-sm font-medium">{alert.message}</p>
                                <Badge variant="secondary" className={getAlertBadge(alert.severity)}>
                                    {t(`admin.reportsAnalytics.alerts.severity.${alert.severity}`, alert.severity)}
                                </Badge>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <Clock className="w-3 h-3" />
                                {alert.timestamp}
                            </div>
                        </div>
                    </div>
                ))}
            </CardContent>
        </Card>
    );
};
