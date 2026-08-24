import { Settings } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import type { SettingsSection } from '../types';
import { SECTION_NAV } from '../constants';
import { useI18n } from '@/shared/lib/hooks/useI18n';

interface SidebarProps {
    activeSection: SettingsSection;
    onSectionChange: (section: SettingsSection) => void;
}

export function Sidebar({ activeSection, onSectionChange }: SidebarProps) {
    const { t } = useI18n();

    return (
        <Card className="lg:col-span-1 h-fit">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Settings className="w-5 h-5" />
                    {t('admin.systemSettings.sidebar.title')}
                </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
                <nav className="space-y-1">
                    {SECTION_NAV.map((section) => {
                        const Icon = section.icon;
                        const isActive = activeSection === section.id;
                        return (
                            <button
                                key={section.id}
                                onClick={() => onSectionChange(section.id)}
                                className={`w-full flex items-center gap-3 px-6 py-3 text-sm transition-colors ${isActive
                                        ? 'bg-primary text-primary-foreground'
                                        : 'hover:bg-muted text-muted-foreground hover:text-foreground'
                                    }`}
                            >
                                <Icon className="w-4 h-4" />
                                <span>{t(section.labelKey)}</span>
                            </button>
                        );
                    })}
                </nav>
            </CardContent>
        </Card>
    );
}
