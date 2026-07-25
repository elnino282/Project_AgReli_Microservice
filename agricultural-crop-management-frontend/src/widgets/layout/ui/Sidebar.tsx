import { useI18n } from '@/shared/lib/hooks/useI18n';
import { Badge, Button, Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/shared/ui';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { SidebarProps } from '../model/types';

// Map navigation item IDs to translation keys
const navTranslationKeys: Record<string, string> = {
    'dashboard': 'nav.dashboard',
    'farms': 'nav.farms',
    'farms-plots': 'nav.farms',
    'seasons': 'nav.seasons',
    'tasks': 'nav.tasks',
    'field-logs': 'nav.fieldLogs',
    'expenses': 'nav.expenses',
    'harvest': 'nav.harvest',
    'suppliers-supplies': 'nav.suppliersSupplies',
    'labor-management': 'nav.laborManagement',
    'inventory': 'nav.inventory',
    'product-warehouse': 'nav.productWarehouse',
    'documents': 'nav.documents',
    'farm-documents': 'nav.farmDocuments',

    'notifications': 'nav.notifications',
    'ai-assistant': 'nav.aiAssistant',
    'chat': 'nav.chat',
    'alerts': 'nav.alertsCenter',
    'incidents': 'nav.incidents',
    'audit-logs': 'nav.auditLogs',
    'users-roles': 'nav.usersRoles',
    'crops-varieties': 'nav.cropsVarieties',
    'reports': 'nav.reports',
    'marketplace': 'nav.marketplace',
    'marketplace-workspace': 'nav.marketplace',
    'marketplace-dashboard': 'nav.marketplaceDashboard',
    'marketplace-products': 'nav.marketplaceProducts',
    'marketplace-orders': 'nav.orders',
    'orders': 'nav.orders',
    'traceability': 'nav.traceability',
    'progress': 'nav.progress',
    'payroll': 'nav.payroll',
    'settings': 'nav.settings',
    'user-guide': 'nav.userGuide',
};

/**
 * Sidebar Component
 * 
 * Side navigation panel with collapsible functionality.
 * Displays navigation items with icons, labels, and optional badges.
 * 
 * Single Responsibility: Side navigation UI
 */
export function Sidebar({
    navigationItems,
    currentView,
    collapsed,
    onNavigate,
    onToggleCollapse,
}: SidebarProps) {
    const { t } = useI18n();
    
    // Get translated label for navigation item
    const getNavLabel = (item: { id: string; label: string }) => {
        const translationKey = navTranslationKeys[item.id];
        if (translationKey) {
            const translated = t(translationKey);
            // If translation returns the key itself, fall back to label
            return translated !== translationKey ? translated : item.label;
        }
        return item.label;
    };
    
    return (
        <aside
            className="acm-sidebar bg-[var(--portal-sidebar-bg)] text-[var(--portal-sidebar-fg)] border-r border-[var(--portal-sidebar-border)] h-full shadow-lg shrink-0 grid transition-[grid-template-columns] duration-300 ease-in-out"
            style={{ gridTemplateColumns: collapsed ? '72px' : '256px' }}
        >
            <div className="h-full min-h-0 flex flex-col overflow-hidden min-w-0 w-full">
                {/* Navigation Items */}
                <nav className="flex-1 min-h-0 p-3 space-y-4 overflow-y-auto overscroll-contain">
                    {(() => {
                        const groupedItems = navigationItems.reduce((acc, item) => {
                            const group = item.group || 'default';
                            if (!acc[group]) acc[group] = [];
                            acc[group].push(item);
                            return acc;
                        }, {} as Record<string, typeof navigationItems>);

                        return Object.entries(groupedItems).map(([groupName, items], groupIndex) => (
                            <div key={groupName} className="space-y-1">
                                {!collapsed && groupName !== 'default' && (
                                    <div className="px-3 py-2 mt-2">
                                        <h4 className="text-xs font-semibold text-[var(--portal-sidebar-fg)] opacity-50 uppercase tracking-wider">
                                            {groupName}
                                        </h4>
                                    </div>
                                )}
                                {collapsed && groupIndex > 0 && (
                                    <div className="w-full h-px bg-[var(--portal-sidebar-border)] my-2 opacity-50" />
                                )}
                                {items.map((item) => {
                                    const isActive = currentView === item.id;

                                    return (
                                        <TooltipProvider key={item.id}>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <button
                                                        onClick={() => onNavigate(item.id)}
                                                        aria-current={isActive ? 'page' : undefined}
                                                        aria-label={collapsed ? getNavLabel(item) : undefined}
                                                        className="acm-sidebar-nav-item acm-hover-surface relative w-full min-h-12 flex items-center gap-3 px-3 py-2 rounded-lg border border-transparent transition-colors duration-200 data-[active=true]:bg-[var(--portal-sidebar-item-hover-bg)]"
                                                        data-active={isActive}
                                                    >
                                                        {isActive && (
                                                            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-current rounded-r-full" />
                                                        )}
                                                        <item.icon className={`w-5 h-5 shrink-0 ${isActive ? 'opacity-100' : 'opacity-70'}`} />
                                                        {!collapsed && (
                                                            <span className={`text-sm truncate ${isActive ? 'font-semibold' : 'font-medium opacity-80'}`}>
                                                                {getNavLabel(item)}
                                                            </span>
                                                        )}
                                                        {!collapsed && item.badge && (
                                                            <Badge
                                                                variant="secondary"
                                                                className={`acm-sidebar-nav-badge ml-auto ${isActive ? 'acm-sidebar-nav-badge-active' : ''}`}
                                                            >
                                                                {item.badge}
                                                            </Badge>
                                                        )}
                                                    </button>
                                                </TooltipTrigger>
                                                {collapsed && (
                                                    <TooltipContent side="right">
                                                        <p>{getNavLabel(item)}</p>
                                                    </TooltipContent>
                                                )}
                                            </Tooltip>
                                        </TooltipProvider>
                                    );
                                })}
                            </div>
                        ));
                    })()}
                </nav>

                {/* Collapse Toggle */}
                <div className="acm-sidebar-footer p-3 border-t">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={onToggleCollapse}
                        className="acm-sidebar-collapse-btn acm-hover-surface w-full min-h-12 justify-center border"
                        aria-label={collapsed ? t('nav.expand', { defaultValue: 'Expand sidebar' }) : t('nav.collapse', { defaultValue: 'Collapse sidebar' })}
                    >
                        {collapsed ? (
                            <ChevronRight className="w-4 h-4" />
                        ) : (
                            <>
                                <ChevronLeft className="w-4 h-4 mr-2" />
                                {t('nav.collapse')}
                            </>
                        )}
                    </Button>
                </div>
            </div>
        </aside>
    );
}
