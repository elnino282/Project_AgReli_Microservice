import { Badge } from '@/shared/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { Skeleton } from '@/shared/ui/skeleton';
import type { DashboardIncidentAlert } from '@/entities/dashboard';
import { useI18n } from '@/shared/lib/hooks/useI18n';
import { AlertTriangle, Clock3, Flame } from 'lucide-react';
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

interface IncidentAlertsProps {
  alerts: DashboardIncidentAlert[];
  isLoading: boolean;
  errorMessage?: string | null;
}

type Translator = (key: string, optionsOrDefault?: Record<string, unknown> | string) => string;

function severityClass(severity: string): string {
  switch (severity.toUpperCase()) {
    case 'CRITICAL':
      return 'bg-destructive text-destructive-foreground';
    case 'HIGH':
      return 'bg-orange-100 text-orange-800';
    case 'MEDIUM':
      return 'bg-amber-100 text-amber-800';
    default:
      return 'bg-secondary text-secondary-foreground';
  }
}

function borderClass(severity: string): string {
  switch (severity.toUpperCase()) {
    case 'CRITICAL':
      return 'border-l-destructive';
    case 'HIGH':
      return 'border-l-orange-500';
    case 'MEDIUM':
      return 'border-l-amber-500';
    default:
      return 'border-l-muted-foreground';
  }
}

function formatDateTime(value: string | null | undefined, locale: string): string | null {
  if (!value) {
    return null;
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return parsed.toLocaleString(locale);
}

function formatDate(value: string | null | undefined, locale: string): string | null {
  if (!value) {
    return null;
  }
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return parsed.toLocaleDateString(locale);
}

function typeLabel(type: string, t: Translator): string {
  switch (type) {
    case 'HIGH_SEVERITY_INCIDENT':
      return t('dashboard.incidentAlerts.type.highSeverityIncident', 'High Severity Incident');
    case 'OPEN_INCIDENT':
      return t('dashboard.incidentAlerts.type.openIncident', 'Open Incident');
    case 'OVERDUE_TASK':
      return t('dashboard.incidentAlerts.type.overdueTask', 'Overdue Task');
    case 'SUSTAINABILITY_WARNING':
      return t('dashboard.incidentAlerts.type.sustainabilityWarning', 'Sustainability Warning');
    case 'SEASON_RISK':
      return t('dashboard.incidentAlerts.type.seasonRisk', 'Season Risk');
    default:
      return type;
  }
}

function severityLabel(severity: string, t: Translator): string {
  switch (severity.toUpperCase()) {
    case 'CRITICAL':
      return t('dashboard.incidentAlerts.severity.critical', 'Critical');
    case 'HIGH':
      return t('dashboard.incidentAlerts.severity.high', 'High');
    case 'MEDIUM':
      return t('dashboard.incidentAlerts.severity.medium', 'Medium');
    case 'LOW':
      return t('dashboard.incidentAlerts.severity.low', 'Low');
    default:
      return severity;
  }
}

export function IncidentAlerts({ alerts, isLoading, errorMessage }: IncidentAlertsProps) {
  const { t, locale } = useI18n();
  const navigate = useNavigate();

  const totalAlerts = alerts.length;
  const sortedAlerts = useMemo(
    () =>
      [...alerts].sort((a, b) => {
        const rank = (severity: string) => {
          switch (severity.toUpperCase()) {
            case 'CRITICAL':
              return 1;
            case 'HIGH':
              return 2;
            case 'MEDIUM':
              return 3;
            default:
              return 4;
          }
        };
        return rank(a.severity) - rank(b.severity);
      }),
    [alerts]
  );

  return (
    <Card className="border-border acm-card-elevated acm-hover-surface">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between gap-2">
          <CardTitle>
            {t('dashboard.incidentAlerts.title', {
              defaultValue: 'Incident & Risk Alerts',
            })}
          </CardTitle>
          <Badge variant="outline">{totalAlerts}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : null}

        {!isLoading && errorMessage ? <p className="acm-body-text text-destructive">{errorMessage}</p> : null}

        {!isLoading && !errorMessage && sortedAlerts.length === 0 ? (
          <p className="acm-body-text text-muted-foreground">
            {t('dashboard.incidentAlerts.empty', {
              defaultValue: 'No incident, overdue task, or sustainability risk alerts.',
            })}
          </p>
        ) : null}

        {!isLoading && !errorMessage && sortedAlerts.length > 0 ? (
          <div className="space-y-3">
            {sortedAlerts.map((alert) => {
              const createdAt = formatDateTime(alert.createdAt, locale);
              const dueDate = formatDate(alert.dueDate, locale);
              const clickable = Boolean(alert.actionUrl);
              const metadataParts: string[] = [];

              if (createdAt) {
                metadataParts.push(
                  t('dashboard.incidentAlerts.meta.created', {
                    value: createdAt,
                    defaultValue: 'Created: {{value}}',
                  })
                );
              }
              if (dueDate) {
                metadataParts.push(
                  t('dashboard.incidentAlerts.meta.due', {
                    value: dueDate,
                    defaultValue: 'Due: {{value}}',
                  })
                );
              }
              if (alert.plotId) {
                metadataParts.push(
                  t('dashboard.incidentAlerts.meta.plot', {
                    plotId: alert.plotId,
                    defaultValue: 'Plot #{{plotId}}',
                  })
                );
              }

              return (
                <button
                  type="button"
                  key={alert.id}
                  className={`w-full text-left rounded-xl border border-border border-l-4 p-3 transition-colors ${
                    borderClass(alert.severity)
                  } ${clickable ? 'hover:bg-muted/40 cursor-pointer' : 'cursor-default'}`}
                  onClick={() => {
                    if (alert.actionUrl) {
                      navigate(alert.actionUrl);
                    }
                  }}
                  disabled={!clickable}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        {alert.type === 'OVERDUE_TASK' ? (
                          <Clock3 className="h-4 w-4 text-amber-600" />
                        ) : alert.severity.toUpperCase() === 'HIGH' || alert.severity.toUpperCase() === 'CRITICAL' ? (
                          <Flame className="h-4 w-4 text-destructive" />
                        ) : (
                          <AlertTriangle className="h-4 w-4 text-amber-600" />
                        )}
                        <p className="text-sm font-semibold">{alert.title}</p>
                      </div>
                      <p className="text-xs text-muted-foreground">{typeLabel(alert.type, t)}</p>
                    </div>
                    <Badge className={severityClass(alert.severity)}>{severityLabel(alert.severity, t)}</Badge>
                  </div>

                  {alert.description ? <p className="mt-2 text-xs text-muted-foreground">{alert.description}</p> : null}

                  {metadataParts.length > 0 ? (
                    <p className="mt-2 text-xs text-muted-foreground">{metadataParts.join(' | ')}</p>
                  ) : null}
                </button>
              );
            })}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
