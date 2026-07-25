import { useFarmerNotifications, useMarkNotificationRead } from '@/entities/notification';
import { useI18n } from '@/shared/lib/hooks/useI18n';
import { usePreferences } from '@/shared/contexts';
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, PageContainer, PageHeader } from '@/shared/ui';
import { Bell, CheckCircle2 } from 'lucide-react';
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

const formatDateTime = (value: string | null | undefined, locale: string) => {
  if (!value) return '-';
  try {
    return new Date(value).toLocaleString(locale);
  } catch {
    return value;
  }
};

export function NotificationsPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { preferences } = usePreferences();
  const notificationsQuery = useFarmerNotifications();
  const markReadMutation = useMarkNotificationRead();

  const notifications = notificationsQuery.data ?? [];
  const unreadCount = useMemo(
    () => notifications.filter((notification) => !notification.readAt).length,
    [notifications]
  );

  const handleOpenNotification = (notification: typeof notifications[number]) => {
    if (!notification.readAt) {
      markReadMutation.mutate(notification.id);
    }
    if (notification.link) {
      navigate(notification.link);
    }
  };

  return (
    <PageContainer>
      <div className="mb-6">
        <PageHeader
          icon={<Bell className="w-8 h-8" />}
          title={t('notifications.title')}
          subtitle={t('notifications.subtitle')}
        />
      </div>

      <Card className="border border-border rounded-xl shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">{t('notifications.inbox')}</CardTitle>
          <Badge variant={unreadCount ? 'destructive' : 'secondary'}>
            {unreadCount} {t('notifications.filters.unread').toLowerCase()}
          </Badge>
        </CardHeader>
        <CardContent className="space-y-4">
          {notificationsQuery.isLoading && (
            <div className="text-sm text-muted-foreground">{t('common.loading')}...</div>
          )}

          {notificationsQuery.isError && (
            <div className="text-sm text-destructive">
              {notificationsQuery.error?.message || t('common.error.description')}
            </div>
          )}

          {!notificationsQuery.isLoading && !notificationsQuery.isError && notifications.length === 0 && (
            <div className="text-sm text-muted-foreground">{t('notifications.noNotifications')}</div>
          )}

          {notifications.map((notification) => (
            <div
              key={notification.id}
              className={`rounded-lg border p-4 transition-all duration-200 hover:shadow-sm focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 ring-offset-background ${
                notification.readAt ? 'bg-muted/30' : 'bg-card'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold">{notification.title || t('common.notification')}</p>
                    {!notification.readAt && <Badge variant="outline">{t('notifications.filters.unread')}</Badge>}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {notification.message || t('common.noMessage')}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatDateTime(notification.createdAt, preferences.locale)}
                  </p>
                </div>
                <div className="flex flex-col gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleOpenNotification(notification)}
                    className="min-h-[44px] shadow-sm transition-all duration-200 hover:scale-[1.02] hover:shadow-md active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background"
                  >
                    {t('common.view')}
                  </Button>
                  {!notification.readAt && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => markReadMutation.mutate(notification.id)}
                      disabled={markReadMutation.isPending}
                      className="min-h-[44px] transition-all duration-200 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background"
                    >
                      <CheckCircle2 className="h-4 w-4 mr-1 text-primary" />
                      {t('common.markRead')}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </PageContainer>
  );
}
