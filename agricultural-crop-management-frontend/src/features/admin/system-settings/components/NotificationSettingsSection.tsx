import { Save, TestTube2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { Switch } from '@/shared/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/table';
import type { NotificationSetting } from '../types';
import { useI18n } from '@/shared/lib/hooks/useI18n';

interface NotificationSettingsProps {
    settings: NotificationSetting[];
    onSettingUpdate: (id: string, field: keyof NotificationSetting, value: boolean) => void;
    onTestNotification: (topic: string) => void;
}

export function NotificationSettingsSection({
    settings,
    onSettingUpdate,
    onTestNotification,
}: NotificationSettingsProps) {
    const { t } = useI18n();

    return (
        <Card>
            <CardHeader>
                <CardTitle>{t('admin.systemSettings.notifications.title')}</CardTitle>
                <CardDescription>{t('admin.systemSettings.notifications.description')}</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>{t('admin.systemSettings.notifications.table.topic')}</TableHead>
                                <TableHead className="text-center">{t('admin.systemSettings.notifications.channels.email')}</TableHead>
                                <TableHead className="text-center">{t('admin.systemSettings.notifications.channels.inApp')}</TableHead>
                                <TableHead className="text-center">{t('admin.systemSettings.notifications.channels.sms')}</TableHead>
                                <TableHead className="text-center">{t('common.actions')}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {settings.map((setting) => (
                                <TableRow key={setting.id}>
                                    <TableCell className="font-medium">
                                        {t(`admin.systemSettings.notifications.topics.${setting.id}`, setting.topic)}
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <Switch
                                            checked={setting.email}
                                            onCheckedChange={(checked: boolean) => onSettingUpdate(setting.id, 'email', checked)}
                                        />
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <Switch
                                            checked={setting.inApp}
                                            onCheckedChange={(checked: boolean) => onSettingUpdate(setting.id, 'inApp', checked)}
                                        />
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <Switch
                                            checked={setting.sms}
                                            onCheckedChange={(checked: boolean) => onSettingUpdate(setting.id, 'sms', checked)}
                                        />
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <Button variant="outline" size="sm" onClick={() => onTestNotification(setting.topic)}>
                                            <TestTube2 className="w-4 h-4 mr-2" />
                                            {t('admin.systemSettings.notifications.test')}
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
                <div className="flex gap-2 mt-6">
                    <Button>
                        <Save className="w-4 h-4 mr-2" />
                        {t('admin.systemSettings.notifications.save')}
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
