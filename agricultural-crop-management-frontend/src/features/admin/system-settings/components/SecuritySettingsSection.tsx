import { Save, LogOut } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { Badge } from '@/shared/ui/badge';
import { Label } from '@/shared/ui/label';
import { Switch } from '@/shared/ui/switch';
import { Separator } from '@/shared/ui/separator';
import type { SecuritySettings as SecuritySettingsType, Device } from '../types';
import { useI18n } from '@/shared/lib/hooks/useI18n';

interface SecuritySettingsProps {
    settings: SecuritySettingsType;
    devices: Device[];
    onSettingUpdate: (key: keyof SecuritySettingsType, value: boolean) => void;
    onSignOutDevice: (deviceId: string) => void;
    onSignOutAll: () => void;
    getDeviceIcon: (type: Device['type']) => React.ComponentType<{ className?: string }>;
}

export function SecuritySettingsSection({
    settings,
    devices,
    onSettingUpdate,
    onSignOutDevice,
    onSignOutAll,
    getDeviceIcon,
}: SecuritySettingsProps) {
    const { t } = useI18n();

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>{t('admin.systemSettings.security.title')}</CardTitle>
                    <CardDescription>{t('admin.systemSettings.security.description')}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/30">
                        <div className="flex-1">
                            <Label htmlFor="enable2FA" className="cursor-pointer">
                                {t('admin.systemSettings.security.enable2FA')}
                            </Label>
                            <p className="text-xs text-muted-foreground mt-1">{t('admin.systemSettings.security.enable2FADescription')}</p>
                        </div>
                        <Switch
                            id="enable2FA"
                            checked={settings.enable2FA}
                            onCheckedChange={(checked: boolean) => onSettingUpdate('enable2FA', checked)}
                        />
                    </div>

                    <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/30">
                        <div className="flex-1">
                            <Label htmlFor="sessionTimeout" className="cursor-pointer">
                                {t('admin.systemSettings.security.sessionTimeout')}
                            </Label>
                            <p className="text-xs text-muted-foreground mt-1">{t('admin.systemSettings.security.sessionTimeoutDescription')}</p>
                        </div>
                        <Switch
                            id="sessionTimeout"
                            checked={settings.sessionTimeout}
                            onCheckedChange={(checked: boolean) => onSettingUpdate('sessionTimeout', checked)}
                        />
                    </div>

                    <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/30">
                        <div className="flex-1">
                            <Label htmlFor="passwordPolicy" className="cursor-pointer">
                                {t('admin.systemSettings.security.passwordPolicy')}
                            </Label>
                            <p className="text-xs text-muted-foreground mt-1">
                                {t('admin.systemSettings.security.passwordPolicyDescription')}
                            </p>
                        </div>
                        <Switch
                            id="passwordPolicy"
                            checked={settings.passwordPolicy}
                            onCheckedChange={(checked: boolean) => onSettingUpdate('passwordPolicy', checked)}
                        />
                    </div>

                    <Separator />

                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <h4>{t('admin.systemSettings.security.activeDevices')}</h4>
                            <Button variant="outline" size="sm" onClick={onSignOutAll}>
                                <LogOut className="w-4 h-4 mr-2" />
                                {t('admin.systemSettings.security.signOutAllDevices')}
                            </Button>
                        </div>
                        <div className="space-y-3">
                            {devices.map((device) => {
                                const DeviceIcon = getDeviceIcon(device.type);
                                return (
                                    <div key={device.id} className="flex items-start gap-3 p-4 rounded-lg border bg-card">
                                        <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                                            <DeviceIcon className="w-5 h-5" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <p className="text-sm font-medium">{device.browser}</p>
                                                {device.current && (
                                                    <Badge variant="secondary" className="bg-emerald-100 text-emerald-700">
                                                        {t('admin.systemSettings.security.currentDevice')}
                                                    </Badge>
                                                )}
                                            </div>
                                            <p className="text-xs text-muted-foreground mb-1">{device.location}</p>
                                            <p className="text-xs text-muted-foreground">{device.lastActive}</p>
                                        </div>
                                        {!device.current && (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                aria-label={t('admin.systemSettings.security.signOutDevice')}
                                                onClick={() => onSignOutDevice(device.id)}
                                            >
                                                <LogOut className="w-4 h-4" />
                                            </Button>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <div className="flex gap-2">
                        <Button>
                            <Save className="w-4 h-4 mr-2" />
                            {t('admin.systemSettings.security.save')}
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
