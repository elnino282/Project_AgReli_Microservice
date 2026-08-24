import { Save } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { Label } from '@/shared/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';
import { Separator } from '@/shared/ui/separator';
import { useI18n } from '@/shared/lib/hooks/useI18n';
import type { SystemPreferences } from '../types';

interface SystemPreferencesProps {
    systemPrefs: SystemPreferences;
    onUpdate: (key: keyof SystemPreferences, value: string) => void;
    onSave: () => void;
    onApplyToAll: () => void;
}

export function SystemPreferencesSection({
    systemPrefs,
    onUpdate,
    onSave,
    onApplyToAll,
}: SystemPreferencesProps) {
    const { t } = useI18n();

    return (
        <Card>
            <CardHeader>
                <CardTitle>{t('admin.systemSettings.preferences.title')}</CardTitle>
                <CardDescription>{t('admin.systemSettings.preferences.description')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <Label htmlFor="language">{t('admin.systemSettings.preferences.language')}</Label>
                        <Select value={systemPrefs.language} onValueChange={(v: string) => onUpdate('language', v)}>
                            <SelectTrigger id="language">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="en">{t('admin.systemSettings.preferences.languages.en')}</SelectItem>
                                <SelectItem value="vi">{t('admin.systemSettings.preferences.languages.vi')}</SelectItem>
                                <SelectItem value="zh">{t('admin.systemSettings.preferences.languages.zh')}</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="timezone">{t('admin.systemSettings.preferences.timeZone')}</Label>
                        <Select value={systemPrefs.timeZone} onValueChange={(v: string) => onUpdate('timeZone', v)}>
                            <SelectTrigger id="timezone">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="UTC+7">{t('admin.systemSettings.preferences.timeZones.utc7')}</SelectItem>
                                <SelectItem value="UTC+8">{t('admin.systemSettings.preferences.timeZones.utc8')}</SelectItem>
                                <SelectItem value="UTC+0">{t('admin.systemSettings.preferences.timeZones.utc0')}</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="unitSystem">{t('admin.systemSettings.preferences.unitSystem')}</Label>
                        <Select value={systemPrefs.unitSystem} onValueChange={(v: string) => onUpdate('unitSystem', v)}>
                            <SelectTrigger id="unitSystem">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="metric">{t('admin.systemSettings.preferences.unitSystems.metric')}</SelectItem>
                                <SelectItem value="imperial">{t('admin.systemSettings.preferences.unitSystems.imperial')}</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="dateFormat">{t('admin.systemSettings.preferences.dateFormat')}</Label>
                        <Select value={systemPrefs.dateFormat} onValueChange={(v: string) => onUpdate('dateFormat', v)}>
                            <SelectTrigger id="dateFormat">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="dd/MM/yyyy">{t('admin.systemSettings.preferences.dateFormats.ddMMyyyy')}</SelectItem>
                                <SelectItem value="MM/dd/yyyy">{t('admin.systemSettings.preferences.dateFormats.MMddyyyy')}</SelectItem>
                                <SelectItem value="yyyy-MM-dd">{t('admin.systemSettings.preferences.dateFormats.yyyyMMdd')}</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="currency">{t('admin.systemSettings.preferences.currency')}</Label>
                        <Select value={systemPrefs.currency} onValueChange={(v: string) => onUpdate('currency', v)}>
                            <SelectTrigger id="currency">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="VND">{t('admin.systemSettings.preferences.currencies.vnd')}</SelectItem>
                                <SelectItem value="USD">{t('admin.systemSettings.preferences.currencies.usd')}</SelectItem>
                                <SelectItem value="EUR">{t('admin.systemSettings.preferences.currencies.eur')}</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="theme">{t('admin.systemSettings.preferences.theme')}</Label>
                        <Select value={systemPrefs.theme} onValueChange={(v: string) => onUpdate('theme', v)}>
                            <SelectTrigger id="theme">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="light">{t('admin.systemSettings.preferences.themes.light')}</SelectItem>
                                <SelectItem value="dark">{t('admin.systemSettings.preferences.themes.dark')}</SelectItem>
                                <SelectItem value="auto">{t('admin.systemSettings.preferences.themes.auto')}</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <Separator />

                <div className="flex gap-2">
                    <Button onClick={onSave}>
                        <Save className="w-4 h-4 mr-2" />
                        {t('common.save')}
                    </Button>
                    <Button variant="outline" onClick={onApplyToAll}>
                        {t('admin.systemSettings.preferences.applyToAll')}
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
