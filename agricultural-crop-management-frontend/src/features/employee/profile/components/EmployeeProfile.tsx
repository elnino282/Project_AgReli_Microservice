import { Avatar, AvatarFallback } from "@/shared/ui/avatar";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Label } from "@/shared/ui/label";
import { Separator } from "@/shared/ui/separator";
import { Switch } from "@/shared/ui/switch";
import { useProfileMe } from "@/entities/user";
import { useAuth } from "@/features/auth";
import { useI18n } from "@/shared/lib/hooks/useI18n";
import { AddressDisplay, BackButton } from "@/shared/ui";
import {
  Briefcase,
  Calendar,
  Clock,
  Loader2,
  Mail,
  MapPin,
  Phone,
  User,
} from "lucide-react";
import { useMemo, useState } from "react";
import type {
  EmployeeProfileData,
  NotificationPreferences,
  RecentActivity,
} from "../types";
import { EditProfileDialog } from "./EditProfileDialog";

export function EmployeeProfile() {
  const { user } = useAuth();
  const { t, locale } = useI18n();
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationPreferences>({
    taskUpdates: true,
    payrollUpdates: true,
  });

  const {
    data: profile,
    isLoading: profileLoading,
    isFetching,
  } = useProfileMe();

  const hasSessionProfile = !!user?.profile;

  const profileData: EmployeeProfileData = useMemo(() => {
    const rawUsername = profile?.username || user?.username || t("employee.profile.usernameFallback");
    const username = rawUsername.includes("@")
      ? rawUsername.split("@")[0]
      : rawUsername;

    const apiFullName = profile?.fullName?.trim();
    const sessionFullName = user?.profile?.fullName?.trim();
    const fullName = apiFullName || sessionFullName || username;

    const addressParts = [profile?.wardName, profile?.provinceName].filter(
      Boolean,
    );
    const address = addressParts.length > 0 ? addressParts.join(", ") : "";

    const rawJoinedDate = profile?.joinedDate || user?.profile?.joinedDate;
    const joinedDate = rawJoinedDate
      ? new Date(rawJoinedDate).toLocaleDateString(locale, {
          day: "2-digit",
          month: "short",
          year: "numeric",
        })
      : t("profile.notAvailable");

    return {
      id: Number(profile?.id ?? user?.profile?.id ?? user?.id ?? 0),
      username,
      displayName: fullName,
      email: profile?.email || user?.profile?.email || user?.email || "",
      phone: profile?.phone || user?.profile?.phone || "",
      address,
      bio: undefined,
      role: "employee",
      status:
        (profile?.status || user?.profile?.status) === "ACTIVE"
          ? "active"
          : "inactive",
      joinedDate,
      lastLogin: t("profile.notAvailable"),
      provinceId: profile?.provinceId ?? user?.profile?.provinceId ?? undefined,
      wardId: profile?.wardId ?? user?.profile?.wardId ?? undefined,
    };
  }, [locale, profile, t, user]);

  const recentActivities: RecentActivity[] = [];

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .toUpperCase();
  };

  if (profileLoading && !hasSessionProfile) {
    return (
      <div className="min-h-screen acm-main-content pb-20 flex items-center justify-center text-muted-foreground">
        <Loader2 className="w-6 h-6 animate-spin mr-2" />
        {t("profile.loading")}
      </div>
    );
  }

  return (
    <div className="min-h-screen acm-main-content pb-20">
      <div className="space-y-6 p-4 sm:p-6 max-w-[1280px] mx-auto">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
            <BackButton to="/employee/tasks" className="w-fit" />
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-foreground">
                {t("employee.profile.title")}
              </h1>
              {isFetching && !profileLoading && (
                <Loader2 className="w-3 h-3 animate-spin text-primary" />
              )}
            </div>
          </div>
          <div className="w-full sm:w-auto">
            <Button
              onClick={() => setEditDialogOpen(true)}
              className="min-h-[44px] w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              <User className="w-4 h-4 mr-2" />
              {t("profile.editProfile")}
            </Button>
          </div>
        </div>

        <Card className="border-border shadow-sm">
          <CardContent className="p-8">
            <div className="space-y-6">
              <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:gap-8">
                <Avatar className="w-24 h-24 border-4 border-primary/20">
                  <AvatarFallback className="bg-primary text-primary-foreground text-2xl">
                    {getInitials(profileData.displayName)}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 space-y-3">
                  <div className="space-y-1">
                    <h2 className="text-2xl font-semibold text-foreground">
                      {profileData.displayName}
                    </h2>
                    <p className="text-base text-muted-foreground">
                      @{profileData.username}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="bg-muted text-foreground">
                      <Briefcase className="w-3 h-3 mr-1" />
                      {t("employee.profile.role")}
                    </Badge>
                    <Badge className="bg-primary/10 text-primary border-primary/20">
                      <div className="w-2 h-2 rounded-full bg-primary mr-1.5" />
                      {profileData.status === "active"
                        ? t("profile.active")
                        : t("profile.inactive")}
                    </Badge>
                  </div>

                  {profileData.bio && (
                    <p className="text-base text-muted-foreground max-w-md">
                      {profileData.bio}
                    </p>
                  )}
                </div>
              </div>

              <Separator className="bg-border" />

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wide">
                    <User className="w-4 h-4" />
                    {t("profile.userId")}
                  </div>
                  <p className="text-base font-mono text-foreground">
                    #{profileData.id}
                  </p>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wide">
                    <Calendar className="w-4 h-4" />
                    {t("profile.joinedDate")}
                  </div>
                  <p className="text-base text-foreground">
                    {profileData.joinedDate}
                  </p>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wide">
                    <Clock className="w-4 h-4" />
                    {t("profile.lastLogin")}
                  </div>
                  <p className="text-base text-foreground">
                    {profileData.lastLogin}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border shadow-sm">
          <CardHeader className="pb-6">
            <CardTitle className="flex items-center gap-2 text-base font-normal text-foreground">
              <Mail className="w-5 h-5" />
              {t("profile.contactInfo.title")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wide">
                  <Mail className="w-5 h-5" />
                  {t("profile.contactInfo.email")}
                </div>
                <p className="text-base text-foreground">
                  {profileData.email ||
                    t("profile.notAvailable")}
                </p>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wide">
                  <Phone className="w-5 h-5" />
                  {t("profile.contactInfo.phone")}
                </div>
                <p className="text-base font-mono text-foreground">
                  {profileData.phone ||
                    t("profile.notAvailable")}
                </p>
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wide">
                <MapPin className="w-5 h-5" />
                {t("profile.contactInfo.address")}
              </div>
              <AddressDisplay
                wardCode={profileData.wardId ?? null}
                fallback={
                  profileData.address ||
                  t("profile.notAvailable")
                }
                className="text-base text-foreground"
              />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border shadow-sm">
          <CardHeader className="pb-6">
            <CardTitle className="flex items-center gap-2 text-base font-normal text-foreground">
              <Clock className="w-5 h-5" />
              {t("profile.recentActivity.title")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-0">
              {recentActivities.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {t("profile.recentActivity.empty")}
                </p>
              ) : (
                recentActivities.map((activity, index) => (
                  <div
                    key={activity.id}
                    className={`flex items-start gap-4 py-4 ${
                      index !== recentActivities.length - 1
                        ? "border-b border-border"
                        : ""
                    }`}
                  >
                    <div className="bg-primary/10 rounded-md p-2 mt-0.5">
                      <User className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1 space-y-1">
                      <p className="text-sm text-muted-foreground">
                        {activity.date}
                      </p>
                      <p className="text-base text-foreground">
                        {activity.description}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border shadow-sm">
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <h4 className="text-base text-foreground">
                {t("profile.notifications.title")}
              </h4>

              <div className="space-y-4">
                <div className="bg-muted border border-border rounded-md p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="space-y-1">
                    <Label
                      htmlFor="employee-task-updates"
                      className="text-sm font-medium text-foreground"
                    >
                      {t(
                        "employee.profile.notifications.taskUpdates.label",
                      )}
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      {t(
                        "employee.profile.notifications.taskUpdates.description",
                      )}
                    </p>
                  </div>
                  <Switch
                    id="employee-task-updates"
                    checked={notifications.taskUpdates}
                    onCheckedChange={(checked) =>
                      setNotifications((prev) => ({
                        ...prev,
                        taskUpdates: checked,
                      }))
                    }
                    className="data-[state=checked]:bg-primary"
                  />
                </div>

                <div className="bg-muted border border-border rounded-md p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="space-y-1">
                    <Label
                      htmlFor="employee-payroll-updates"
                      className="text-sm font-medium text-foreground"
                    >
                      {t(
                        "employee.profile.notifications.payrollUpdates.label",
                      )}
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      {t(
                        "employee.profile.notifications.payrollUpdates.description",
                      )}
                    </p>
                  </div>
                  <Switch
                    id="employee-payroll-updates"
                    checked={notifications.payrollUpdates}
                    onCheckedChange={(checked) =>
                      setNotifications((prev) => ({
                        ...prev,
                        payrollUpdates: checked,
                      }))
                    }
                    className="data-[state=checked]:bg-primary"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <EditProfileDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          profileData={profileData}
        />
      </div>
    </div>
  );
}
