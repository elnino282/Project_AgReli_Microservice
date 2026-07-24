import { Link } from "react-router-dom";
import {
  Activity,
  AlertCircle,
  Boxes,
  Clock,
  FileText,
  Loader2,
  PackageCheck,
  Sprout,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { useI18n } from "@/shared/lib/hooks/useI18n";
import type { RecentActivityItem } from "../types";

interface RecentActivityTimelineProps {
  activities: RecentActivityItem[];
  isLoading: boolean;
  errorMessage: string | null;
}

function getActivityIcon(type: string) {
  switch (type) {
    case "TASK_UPDATE":
      return <Activity className="w-4 h-4 text-secondary" />;
    case "FIELD_LOG":
      return <FileText className="w-4 h-4 text-primary" />;
    case "INCIDENT":
      return <AlertCircle className="w-4 h-4 text-destructive" />;
    case "HARVEST":
      return <Sprout className="w-4 h-4 text-emerald-600" />;
    case "WAREHOUSE_MOVEMENT":
      return <Boxes className="w-4 h-4 text-amber-600" />;
    case "MARKETPLACE_ORDER":
      return <PackageCheck className="w-4 h-4 text-indigo-600" />;
    default:
      return <Activity className="w-4 h-4 text-muted-foreground" />;
  }
}

function formatOccurredAt(value: string, locale: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString(locale);
}

export function RecentActivityTimeline({
  activities,
  isLoading,
  errorMessage,
}: RecentActivityTimelineProps) {
  const { t, locale } = useI18n();

  const sortedActivities = [...activities].sort((a, b) =>
    b.occurredAt.localeCompare(a.occurredAt)
  );

  return (
    <Card className="border-border rounded-2xl shadow-sm">
      <CardHeader>
        <CardTitle>
          {t("dashboard.recentActivityTimeline.title", "Recent Activity")}
        </CardTitle>
        <CardDescription>
          {t(
            "dashboard.recentActivityTimeline.subtitle",
            "Latest actions and updates across your farm"
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            {t(
              "dashboard.recentActivityTimeline.loading",
              "Loading recent activities..."
            )}
          </div>
        )}

        {!isLoading && errorMessage && (
          <p className="text-sm text-destructive">{errorMessage}</p>
        )}

        {!isLoading && !errorMessage && sortedActivities.length === 0 && (
          <p className="text-sm text-muted-foreground">
            {t(
              "dashboard.recentActivityTimeline.empty",
              "No recent activity yet."
            )}
          </p>
        )}

        {!isLoading && !errorMessage && sortedActivities.length > 0 && (
          <div className="space-y-4">
            {sortedActivities.map((activity, index) => (
              <div key={activity.id} className="flex items-start gap-4">
                <div className="relative">
                  <div className="w-8 h-8 rounded-full bg-card border-2 border-border flex items-center justify-center">
                    {getActivityIcon(activity.type)}
                  </div>
                  {index < sortedActivities.length - 1 && (
                    <div className="absolute left-4 top-8 w-0.5 h-8 bg-border"></div>
                  )}
                </div>

                <div className="flex-1 pb-4 space-y-1">
                  <p className="text-sm text-foreground font-medium">
                    {activity.title}
                  </p>
                  {activity.description && (
                    <p className="text-sm text-muted-foreground">
                      {activity.description}
                    </p>
                  )}
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    {activity.actorName && <span>{activity.actorName}</span>}
                    {activity.actorName && <span>|</span>}
                    <Clock className="w-3 h-3" />
                    <span>{formatOccurredAt(activity.occurredAt, locale)}</span>
                    {activity.actionUrl && (
                      <>
                        <span>|</span>
                        <Button
                          asChild
                          variant="link"
                          size="sm"
                          className="h-auto p-0 text-xs"
                        >
                          <Link to={activity.actionUrl}>
                            {t("dashboard.recentActivityTimeline.actions.open", "Open")}
                          </Link>
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
