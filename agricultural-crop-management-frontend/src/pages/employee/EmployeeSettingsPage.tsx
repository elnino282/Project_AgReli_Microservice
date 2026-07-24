import { useI18n } from "@/shared/lib/hooks/useI18n";
import { BackButton, Card, CardContent, CardHeader, CardTitle } from "@/shared/ui";

export function EmployeeSettingsPage() {
  const { t } = useI18n();

  return (
    <div className="p-4 sm:p-6 max-w-[900px] mx-auto space-y-4">
      <BackButton to="/employee/tasks" className="w-fit" />
      <Card className="rounded-2xl border border-border">
        <CardHeader>
          <CardTitle>{t("employee.settings.title")}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {t("employee.settings.description")}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
