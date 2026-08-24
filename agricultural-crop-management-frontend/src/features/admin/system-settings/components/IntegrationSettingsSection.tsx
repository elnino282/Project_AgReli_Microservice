import { Save, TestTube2, Eye, EyeOff, Copy, Cloud, DollarSign, Cpu, Zap } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { Badge } from '@/shared/ui/badge';
import { Label } from '@/shared/ui/label';
import { Input } from '@/shared/ui/input';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/shared/ui/accordion';
import type { Integration } from '../types';
import { useI18n } from '@/shared/lib/hooks/useI18n';

interface IntegrationSettingsProps {
    integrations: Record<string, Integration>;
    showApiKey: Record<string, boolean>;
    onApiKeyUpdate: (service: string, apiKey: string) => void;
    onToggleApiKeyVisibility: (service: string) => void;
    onTestConnection: (service: string) => void;
    getStatusBadge: (status: string) => string;
}

export function IntegrationSettingsSection({
    integrations,
    showApiKey,
    onApiKeyUpdate,
    onToggleApiKeyVisibility,
    onTestConnection,
    getStatusBadge,
}: IntegrationSettingsProps) {
    const { t } = useI18n();
    const integrationConfigs = [
        { key: 'weather', icon: Cloud, labelKey: 'admin.systemSettings.integrations.services.weather' },
        { key: 'market', icon: DollarSign, labelKey: 'admin.systemSettings.integrations.services.market' },
        { key: 'payment', icon: DollarSign, labelKey: 'admin.systemSettings.integrations.services.payment' },
        { key: 'iot', icon: Cpu, labelKey: 'admin.systemSettings.integrations.services.iot' },
        { key: 'ai', icon: Zap, labelKey: 'admin.systemSettings.integrations.services.ai' },
    ];

    return (
        <Card>
            <CardHeader>
                <CardTitle>{t('admin.systemSettings.integrations.title')}</CardTitle>
                <CardDescription>{t('admin.systemSettings.integrations.description')}</CardDescription>
            </CardHeader>
            <CardContent>
                <Accordion type="single" collapsible className="w-full">
                    {integrationConfigs.map(({ key, icon: Icon, labelKey }) => {
                        const integration = integrations[key];
                        if (!integration) return null;

                        return (
                            <AccordionItem key={key} value={key}>
                                <AccordionTrigger>
                                    <div className="flex items-center gap-3">
                                        <Icon className="w-5 h-5" />
                                        <span>{t(labelKey)}</span>
                                        <Badge variant="secondary" className={getStatusBadge(integration.status)}>
                                            {t(`admin.systemSettings.integrations.status.${integration.status}`, integration.status)}
                                        </Badge>
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent className="space-y-4 pt-4">
                                    <div className="space-y-2">
                                        <Label htmlFor={`${key}ApiKey`}>{t('admin.systemSettings.integrations.apiKey')}</Label>
                                        <div className="flex gap-2">
                                            <Input
                                                id={`${key}ApiKey`}
                                                type={showApiKey[key] ? 'text' : 'password'}
                                                value={integration.apiKey}
                                                placeholder={key === 'payment' ? t('admin.systemSettings.integrations.paymentApiKeyPlaceholder') : undefined}
                                                onChange={(e) => onApiKeyUpdate(key, e.target.value)}
                                            />
                                            <Button
                                                variant="outline"
                                                size="icon"
                                                aria-label={showApiKey[key]
                                                    ? t('admin.systemSettings.integrations.hideApiKey')
                                                    : t('admin.systemSettings.integrations.showApiKey')}
                                                onClick={() => onToggleApiKeyVisibility(key)}
                                            >
                                                {showApiKey[key] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                            </Button>
                                            {key !== 'payment' && (
                                                <Button
                                                    variant="outline"
                                                    size="icon"
                                                    aria-label={t('admin.systemSettings.integrations.copyApiKey')}
                                                >
                                                    <Copy className="w-4 h-4" />
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button variant="outline" onClick={() => onTestConnection(key)}>
                                            <TestTube2 className="w-4 h-4 mr-2" />
                                            {t('admin.systemSettings.integrations.testConnection')}
                                        </Button>
                                        <Button>
                                            <Save className="w-4 h-4 mr-2" />
                                            {t('common.save')}
                                        </Button>
                                    </div>
                                </AccordionContent>
                            </AccordionItem>
                        );
                    })}
                </Accordion>
            </CardContent>
        </Card>
    );
}
