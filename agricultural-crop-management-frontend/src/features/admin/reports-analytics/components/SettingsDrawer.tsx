import { Settings, Check } from 'lucide-react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/shared/ui/sheet';
import { Button } from '@/shared/ui/button';
import { Label } from '@/shared/ui/label';
import { Switch } from '@/shared/ui/switch';
import { Input } from '@/shared/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';
import { Separator } from '@/shared/ui/separator';
import { useI18n } from '@/shared/lib/hooks/useI18n';

interface SettingsDrawerProps {
    settingsOpen: boolean;
    setSettingsOpen: (open: boolean) => void;
    handleSettingsSave: () => void;
}

export const SettingsDrawer: React.FC<SettingsDrawerProps> = ({
    settingsOpen,
    setSettingsOpen,
    handleSettingsSave,
}) => {
    const { t } = useI18n();

    return (
        <Sheet open={settingsOpen} onOpenChange={setSettingsOpen}>
            <SheetContent>
                <SheetHeader>
                    <SheetTitle className="flex items-center gap-2">
                        <Settings className="w-5 h-5" />
                        {t('admin.reportsAnalytics.settings.title')}
                    </SheetTitle>
                    <SheetDescription>
                        {t('admin.reportsAnalytics.settings.description')}
                    </SheetDescription>
                </SheetHeader>
                <div className="mt-6 space-y-6">
                    <div>
                        <h4 className="mb-4">{t('admin.reportsAnalytics.settings.weeklySummaryEmail')}</h4>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/30">
                                <div className="flex-1">
                                    <Label htmlFor="enableEmail" className="cursor-pointer">
                                        {t('admin.reportsAnalytics.settings.enableWeeklyReports')}
                                    </Label>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        {t('admin.reportsAnalytics.settings.enableWeeklyReportsDescription')}
                                    </p>
                                </div>
                                <Switch id="enableEmail" defaultChecked />
                            </div>

                            <div className="space-y-2">
                                <Label>{t('admin.reportsAnalytics.settings.reportTypes')}</Label>
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2">
                                        <input type="checkbox" id="userActivity" defaultChecked className="rounded" />
                                        <Label htmlFor="userActivity" className="text-sm cursor-pointer">
                                            {t('admin.reportsAnalytics.settings.reportTypesOptions.userActivity')}
                                        </Label>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <input type="checkbox" id="systemHealth" defaultChecked className="rounded" />
                                        <Label htmlFor="systemHealth" className="text-sm cursor-pointer">
                                            {t('admin.reportsAnalytics.settings.reportTypesOptions.systemHealth')}
                                        </Label>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <input type="checkbox" id="financials" className="rounded" />
                                        <Label htmlFor="financials" className="text-sm cursor-pointer">
                                            {t('admin.reportsAnalytics.settings.reportTypesOptions.financial')}
                                        </Label>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <input type="checkbox" id="alerts" defaultChecked className="rounded" />
                                        <Label htmlFor="alerts" className="text-sm cursor-pointer">
                                            {t('admin.reportsAnalytics.settings.reportTypesOptions.criticalAlerts')}
                                        </Label>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="recipients">{t('admin.reportsAnalytics.settings.emailRecipients')}</Label>
                                <Input
                                    id="recipients"
                                    type="email"
                                    placeholder={t('admin.reportsAnalytics.settings.emailRecipientsPlaceholder')}
                                    defaultValue="admin@acm-platform.com"
                                />
                                <p className="text-xs text-muted-foreground">
                                    {t('admin.reportsAnalytics.settings.emailRecipientsHelp')}
                                </p>
                            </div>

                            <div className="space-y-2">
                                <Label>{t('admin.reportsAnalytics.settings.sendSchedule')}</Label>
                                <Select defaultValue="monday">
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="monday">{t('admin.reportsAnalytics.settings.schedule.monday')}</SelectItem>
                                        <SelectItem value="friday">{t('admin.reportsAnalytics.settings.schedule.friday')}</SelectItem>
                                        <SelectItem value="sunday">{t('admin.reportsAnalytics.settings.schedule.sunday')}</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>

                    <Separator />

                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            className="flex-1"
                            onClick={() => setSettingsOpen(false)}
                        >
                            {t('common.cancel')}
                        </Button>
                        <Button className="flex-1" onClick={handleSettingsSave}>
                            <Check className="w-4 h-4 mr-2" />
                            {t('admin.reportsAnalytics.settings.save')}
                        </Button>
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    );
};
