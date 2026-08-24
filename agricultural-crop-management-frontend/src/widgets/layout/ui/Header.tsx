import { ThemeToggle } from '@/shared/ui/theme-toggle';
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
import type { HeaderProps } from '../model/types';
import { DashboardHeader } from './DashboardHeader';
import { ProfileMenu } from './ProfileMenu';
import { GlobalSearchBar } from './SearchBar';

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
            className="h-16 border-b border-[var(--portal-sidebar-border)] flex items-center justify-between px-3 sm:px-4 gap-2 sm:gap-4 shrink-0 z-50 bg-[var(--portal-sidebar-bg)] text-[var(--portal-sidebar-fg)]"
        >
            {/* Left Section */}
            <div className="flex items-center gap-2 sm:gap-4 min-w-0">
                {/* Sidebar Toggle */}
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={onToggleSidebar}
                    className="shrink-0 text-[var(--portal-sidebar-fg)] hover:bg-[var(--portal-sidebar-item-hover-bg)]"
                    aria-label={t('nav.toggleSidebar', { defaultValue: 'Toggle navigation' })}
                >
                    <Menu className="w-5 h-5" />
                </Button>

                {/* Logo */}
                <button
                    onClick={() => onViewChange('dashboard')}
                    className="flex items-center gap-2 shrink-0 min-w-0 hover:opacity-80 transition-opacity"
                >
                    <div className="w-8 h-8 rounded-lg bg-[var(--portal-sidebar-item-hover-bg)] shadow-sm flex items-center justify-center">
                        <span className="text-[var(--portal-sidebar-fg)] text-lg">{config.emoji}</span>
                    </div>
                    <div className="hidden sm:block min-w-0">
                        <div className="font-semibold text-sm text-[var(--portal-sidebar-fg)]">{t('common.appName')}</div>
                        <div className="text-xs text-[var(--portal-sidebar-fg)] opacity-80 truncate">{config.name}</div>
                    </div>
                </button>

            </div>

            {/* Right Section */}
            <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                {/* Dashboard → Public switch link */}
                <DashboardHeader />

                {/* Global Search */}
                {(portalType === "ADMIN" || portalType === "FARMER") && (
                    <GlobalSearchBar
                        portal={portalType === "ADMIN" ? "admin" : "farmer"}
                    />
                )}

                <ThemeToggle className="text-[var(--portal-sidebar-fg)] hover:bg-[var(--portal-sidebar-item-hover-bg)]" />

                {/* AI Assistant Toggle */}
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={onAiDrawerOpen}
                                className="shrink-0 text-[var(--portal-sidebar-fg)] hover:bg-[var(--portal-sidebar-item-hover-bg)]"
                                aria-label={t('header.aiAssistant', { defaultValue: 'AI Assistant' })}
                            >
                                <Bot className="w-5 h-5" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>{t('header.aiAssistant')}</p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>

                {/* Notifications Bell */}
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={onNotificationsOpen}
                                className="relative shrink-0 text-[var(--portal-sidebar-fg)] hover:bg-[var(--portal-sidebar-item-hover-bg)]"
                                aria-label={t('header.notifications', { defaultValue: 'Notifications' })}
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

                <Separator orientation="vertical" className="h-8 bg-[var(--portal-sidebar-border)] hidden sm:block" />

                {/* Profile Menu */}
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
