import { ThemeToggle } from '@/components/ThemeToggle';
import { useI18n } from '@/shared/lib/hooks/useI18n';
import {
  Badge,
  Button,
  Separator,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/shared/ui';
import { Bell, Bot, Menu } from 'lucide-react';
import { DashboardHeader } from '@/widgets/layout/ui/DashboardHeader';
import { ProfileMenu } from '@/widgets/layout/ui/ProfileMenu';
import { GlobalSearchBar } from '@/widgets/layout/ui/SearchBar';
import { HeaderProps } from '../types';

/**
 * Header Component
 * 
 * Top navigation bar with branding, search, and user actions.
 * Integrates SearchBar and ProfileMenu sub-components.
 * 
 * Single Responsibility: Top navigation UI
 */
export function Header({
  config,
  sidebarCollapsed: _sidebarCollapsed,
  unreadCount,
  userName,
  userEmail,
  userAvatar,
  portalType,
  theme,
  language,
  onToggleSidebar,
  onViewChange,
  onAiDrawerOpen,
  onNotificationsOpen,
  onThemeChange,
  onLanguageChange,
  onLogout,
}: HeaderProps) {
  const { t } = useI18n();

  return (
    <header
      className="h-16 border-b border-white/10 flex items-center justify-between px-3 sm:px-4 gap-2 sm:gap-4 shrink-0 z-50"
      style={{ backgroundColor: config.color }}
    >
      <div className="flex items-center gap-2 sm:gap-4 min-w-0">
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleSidebar}
          className="shrink-0 text-white hover:bg-white/10"
          aria-label={t('nav.toggleSidebar', { defaultValue: 'Toggle navigation' })}
        >
          <Menu className="w-5 h-5" />
        </Button>

        <button
          onClick={() => onViewChange('dashboard')}
          className="flex items-center gap-2 shrink-0 min-w-0 hover:opacity-80 transition-opacity"
        >
          <div className="w-8 h-8 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center">
            <span className="text-white text-lg">{config.emoji}</span>
          </div>
          <div className="hidden sm:block min-w-0">
            <div className="font-semibold text-sm text-white">{t('common.appName')}</div>
            <div className="text-xs text-white/80 truncate">{config.name}</div>
          </div>
        </button>

      </div>

      <div className="flex items-center gap-1 sm:gap-2 shrink-0">
        <DashboardHeader />

        {(portalType === 'ADMIN' || portalType === 'FARMER') && (
          <GlobalSearchBar portal={portalType === 'ADMIN' ? 'admin' : 'farmer'} />
        )}

        <ThemeToggle className="text-white hover:bg-white/10" />

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={onAiDrawerOpen}
                className="shrink-0 text-white hover:bg-white/10"
              >
                <Bot className="w-5 h-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{t('header.aiAssistant')}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={onNotificationsOpen}
                className="relative shrink-0 text-white hover:bg-white/10"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <Badge
                    variant="destructive"
                    className="absolute -top-1 -right-1 h-5 min-w-5 flex items-center justify-center p-0 text-xs"
                  >
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </Badge>
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{t('header.notifications')}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <Separator orientation="vertical" className="h-8 bg-white/20" />

        <ProfileMenu
          userName={userName}
          userEmail={userEmail}
          userAvatar={userAvatar}
          portalType={portalType}
          theme={theme}
          language={language}
          onThemeChange={onThemeChange}
          onLanguageChange={onLanguageChange}
          onViewChange={onViewChange}
          onLogout={onLogout}
        />
      </div>
    </header>
  );
}

