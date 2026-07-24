import { BackButton, Card, CardContent, PageContainer } from '@/shared/ui';
import { ChangePasswordSection } from '@/features/farmer/account/components/ChangePasswordSection';
import { PreferencesForm } from '@/features/shared/preferences';
import { useI18n } from '@/shared/lib/hooks/useI18n';
import { Settings } from 'lucide-react';
import { useState } from 'react';

const farmerCardClass = 'rounded-[18px] border border-border bg-card shadow-sm';

export function FarmerPreferences() {
  const { t } = useI18n();
  const [isPreferencesDirty, setIsPreferencesDirty] = useState(false);
  
  return (
    <PageContainer>
      <div className="space-y-6">
        <div>
          <BackButton
            to="/farmer/dashboard"
            confirmOnLeave={isPreferencesDirty}
            className="w-fit"
          />
        </div>

        <Card className={farmerCardClass}>
          <CardContent className="p-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="truncate text-2xl font-bold text-foreground">{t('preferences.title')}</h1>
                  <Settings className="w-5 h-5 text-primary" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <ChangePasswordSection />

        <PreferencesForm onDirtyChange={setIsPreferencesDirty} />
      </div>
    </PageContainer>
  );
}

