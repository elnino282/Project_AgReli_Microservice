import { BackButton, Button, Card, CardContent, Label, PageContainer, Separator, Switch } from '@/shared/ui';
import { useFarms } from '@/entities/farm';
import { usePlots } from '@/entities/plot';
import { useSeasons } from '@/entities/season';
import { useProfileMe } from '@/entities/user';
import { useAuth } from '@/features/auth';
import {
  ContactInfoCard,
  ProfileHeroCard,
  SectionCardHeader,
} from '@/features/shared/profile';
import { useI18n } from '@/shared/lib/hooks/useI18n';
import {
  BookOpen,
  CalendarCheck,
  CheckCircle2,
  ChevronRight,
  Clock,
  FileText,
  Grid3x3,
  Loader2,
  Package,
  Sprout,
  TrendingUp,
  User,
  Bell,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import type {
  FarmerProfileData,
  FarmOverviewStats,
  NotificationPreferences,
  RecentActivity,
} from '../types';
import { EditProfileDialog } from './EditProfileDialog';

const farmerCardClass = 'rounded-[18px] border border-border bg-card shadow-sm';
const farmerContentCardClass = `${farmerCardClass} overflow-hidden`;

export function FarmerProfile() {
  const { t } = useI18n();
  const { user } = useAuth();
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationPreferences>({
    taskReminders: true,
    incidentAlerts: true,
  });

  const { data: profile, isLoading: profileLoading, isFetching } = useProfileMe();
  const { data: farmsData } = useFarms();
  const { data: plotsData } = usePlots();
  const { data: seasonsData } = useSeasons();

  const farms = farmsData?.content ?? [];
  const plots = plotsData ?? [];
  const seasons = seasonsData?.items ?? [];

  const hasSessionProfile = !!user?.profile;

  const profileData: FarmerProfileData = useMemo(() => {
    const rawUsername = profile?.username || user?.username || 'farmer';
    const username = rawUsername.includes('@') ? rawUsername.split('@')[0] : rawUsername;
    const apiFullName = profile?.fullName?.trim();
    const sessionFullName = user?.profile?.fullName?.trim();
    const fullName = apiFullName || sessionFullName || username;

    const addressParts = [profile?.wardName, profile?.provinceName].filter(Boolean);
    const address = addressParts.length > 0 ? addressParts.join(', ') : 'Not available';

    const rawJoinedDate = profile?.joinedDate || user?.profile?.joinedDate;
    const joinedDate = rawJoinedDate
      ? new Date(rawJoinedDate).toLocaleDateString('en-GB', {
          day: '2-digit', month: 'short', year: 'numeric',
        })
      : 'Not available';

    return {
      id: Number(profile?.id ?? user?.profile?.id ?? user?.id ?? 0),
      username,
      displayName: fullName,
      email: profile?.email || user?.profile?.email || user?.email || 'Not available',
      phone: profile?.phone || user?.profile?.phone || 'Not available',
      address,
      bio: undefined,
      role: 'farmer',
      status: (profile?.status || user?.profile?.status) === 'ACTIVE' ? 'active' : 'inactive',
      joinedDate,
      lastLogin: 'Not available',
      provinceId: profile?.provinceId ?? user?.profile?.provinceId ?? undefined,
      wardId: profile?.wardId ?? user?.profile?.wardId ?? undefined,
    };
  }, [profile, user]);

  const farmStats: FarmOverviewStats = useMemo(() => {
    const totalFarms = farms.length;
    const totalArea = farms.reduce((sum, farm) => {
      const areaValue = typeof farm.area === 'string' ? parseFloat(farm.area) : farm.area ?? 0;
      return sum + (Number.isFinite(areaValue) ? areaValue : 0);
    }, 0);
    const totalPlots = plots.length;
    const activeSeasons = seasons.filter((season) => season.status === 'ACTIVE').length;
    return { totalFarms, totalArea, totalPlots, activeSeasons };
  }, [farms, plots, seasons]);

  const recentActivities: RecentActivity[] = [];

  const getInitials = (name: string) =>
    name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase();

  const getActivityIcon = (type: RecentActivity['type']) => {
    switch (type) {
      case 'task':
        return <CheckCircle2 className="w-4 h-4 text-primary" />;
      case 'field_log':
        return <BookOpen className="w-4 h-4 text-primary" />;
      case 'season':
        return <CalendarCheck className="w-4 h-4 text-primary" />;
      case 'plot':
        return <Grid3x3 className="w-4 h-4 text-primary" />;
      case 'harvest':
        return <Package className="w-4 h-4 text-primary" />;
      default:
        return <FileText className="w-4 h-4 text-primary" />;
    }
  };

  if (profileLoading && !hasSessionProfile) {
    return (
      <div className="min-h-screen acm-main-content pb-20 flex items-center justify-center text-muted-foreground">
        <Loader2 className="w-6 h-6 animate-spin mr-2" />
        {t('profile.loading')}
      </div>
    );
  }

  return (
    <PageContainer>
      <div className="space-y-6">
        <BackButton to="/farmer/dashboard" className="w-fit" />

        <Card className={farmerCardClass}>
          <CardContent className="p-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="truncate text-2xl font-bold text-foreground">{t('profile.title')}</h1>
                  {isFetching && !profileLoading && (
                    <Loader2 className="w-3 h-3 animate-spin text-primary" />
                  )}
                </div>
              </div>
              <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
                <Button
                  onClick={() => setEditDialogOpen(true)}
                  className="w-full rounded-[14px] sm:w-auto"
                >
                  <User className="w-4 h-4 mr-2" />
                  {t('profile.editProfile')}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <ProfileHeroCard
          displayName={profileData.displayName}
          username={profileData.username}
          initials={getInitials(profileData.displayName)}
          roleIcon={Sprout}
          roleLabel={t('profile.farmer')}
          isActive={profileData.status === 'active'}
          userId={profileData.id}
          joinedDate={profileData.joinedDate}
          lastLogin={profileData.lastLogin}
          labels={{
            userId: t('profile.userId'),
            joinedDate: t('profile.joinedDate'),
            lastLogin: t('profile.lastLogin'),
            status: t('profile.active'),
          }}
        />

        <ContactInfoCard
          email={profileData.email}
          phone={profileData.phone}
          address={profileData.address}
          wardCode={profileData.wardId}
          labels={{
            title: t('profile.contactInfo.title'),
            email: t('profile.contactInfo.email'),
            phone: t('profile.contactInfo.phone'),
            address: t('profile.contactInfo.address'),
          }}
        />

        {/* Farm Overview Card */}
        <Card className={farmerContentCardClass}>
          <SectionCardHeader icon={Sprout} title={t('profile.farmOverview.title')} />
          <CardContent className="space-y-6 px-6 pb-6 sm:px-8 sm:pb-8">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="bg-muted/30 border border-border rounded-2xl p-4 flex items-center gap-4">
                <div className="bg-secondary/10 rounded-2xl p-3">
                  <Sprout className="w-6 h-6 text-secondary" />
                </div>
                <div>
                  <p className="text-2xl font-mono text-foreground">{farmStats.totalFarms}</p>
                  <p className="text-sm text-muted-foreground">{t('profile.farmOverview.totalFarms')}</p>
                </div>
              </div>

              <div className="bg-muted/30 border border-border rounded-2xl p-4 flex items-center gap-4">
                <div className="bg-primary/10 rounded-2xl p-3">
                  <TrendingUp className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-mono text-foreground">{farmStats.totalArea} ha</p>
                  <p className="text-sm text-muted-foreground">{t('profile.farmOverview.totalArea')}</p>
                </div>
              </div>

              <div className="bg-muted/30 border border-border rounded-2xl p-4 flex items-center gap-4">
                <div className="bg-accent/10 rounded-2xl p-3">
                  <Grid3x3 className="w-6 h-6 text-accent" />
                </div>
                <div>
                  <p className="text-2xl font-mono text-foreground">{farmStats.totalPlots}</p>
                  <p className="text-sm text-muted-foreground">{t('profile.farmOverview.plots')}</p>
                </div>
              </div>

              <div className="bg-primary/5 border-2 border-primary/20 rounded-2xl p-4 flex items-center gap-4">
                <div className="bg-primary/10 rounded-2xl p-3">
                  <CalendarCheck className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-mono text-primary">{farmStats.activeSeasons}</p>
                  <p className="text-sm text-primary opacity-80">{t('profile.farmOverview.activeSeasons')}</p>
                </div>
              </div>
            </div>

            <Separator className="bg-border" />

            <Button
              variant="ghost"
              className="text-primary hover:text-primary hover:bg-primary/10"
            >
              {t('profile.farmOverview.viewDetails')}
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          </CardContent>
        </Card>

        {/* Recent Activity Card */}
        <Card className={farmerContentCardClass}>
          <SectionCardHeader icon={Clock} title={t('profile.recentActivity.title')} />
          <CardContent className="px-6 pb-6 sm:px-8 sm:pb-8">
            {recentActivities.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {t('profile.recentActivity.empty')}
              </p>
            ) : (
              <div className="space-y-0">
                {recentActivities.map((activity, index) => (
                  <div
                    key={activity.id}
                    className={`flex items-start gap-4 py-4 ${
                      index !== recentActivities.length - 1 ? 'border-b border-border' : ''
                    }`}
                  >
                    <div className="bg-primary/10 rounded-2xl p-2 mt-0.5">
                      {getActivityIcon(activity.type)}
                    </div>
                    <div className="flex-1 space-y-1">
                      <p className="text-sm text-muted-foreground">{activity.date}</p>
                      <p className="text-base text-foreground">{activity.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Notifications Card */}
        <Card className={farmerContentCardClass}>
          <SectionCardHeader icon={Bell} title={t('profile.notifications.title')} />
          <CardContent className="space-y-4 px-6 pb-6 sm:px-8 sm:pb-8">
            <div className="bg-muted border border-border rounded-2xl p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <Label htmlFor="task-reminders" className="text-sm font-medium text-foreground">
                  {t('profile.notifications.taskReminders.label')}
                </Label>
                <p className="text-xs text-muted-foreground">
                  {t('profile.notifications.taskReminders.description')}
                </p>
              </div>
              <Switch
                id="task-reminders"
                checked={notifications.taskReminders}
                onCheckedChange={(checked) =>
                  setNotifications((prev) => ({ ...prev, taskReminders: checked }))
                }
                className="data-[state=checked]:bg-primary"
              />
            </div>

            <div className="bg-muted border border-border rounded-2xl p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <Label htmlFor="incident-alerts" className="text-sm font-medium text-foreground">
                  {t('profile.notifications.incidentAlerts.label')}
                </Label>
                <p className="text-xs text-muted-foreground">
                  {t('profile.notifications.incidentAlerts.description')}
                </p>
              </div>
              <Switch
                id="incident-alerts"
                checked={notifications.incidentAlerts}
                onCheckedChange={(checked) =>
                  setNotifications((prev) => ({ ...prev, incidentAlerts: checked }))
                }
                className="data-[state=checked]:bg-primary"
              />
            </div>
          </CardContent>
        </Card>

        <EditProfileDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          profileData={profileData}
        />
      </div>
    </PageContainer>
  );
}
