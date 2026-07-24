import { Link } from 'react-router-dom';
import {
    Building2,
    CalendarDays,
    ChevronRight,
    CircleDot,
    Home,
    Layers3,
    Map,
    PackageSearch,
} from 'lucide-react';

import { Skeleton } from '@/shared/ui';
import { cn } from '@/shared/lib';
import { useI18n } from '@/shared/lib/hooks/useI18n';
import type { BreadcrumbKind, BreadcrumbPath } from '../model/types';

type BreadcrumbContextBarProps = {
    breadcrumbs: BreadcrumbPath[];
};

const kindIconMap: Record<BreadcrumbKind, typeof Home> = {
    portal: Home,
    module: Layers3,
    farm: Building2,
    plot: Map,
    season: CalendarDays,
    record: PackageSearch,
    action: CircleDot,
};

const entityKinds = new Set<BreadcrumbKind>(['farm', 'plot', 'season']);

function isEntityKind(kind?: BreadcrumbKind): kind is 'farm' | 'plot' | 'season' {
    return !!kind && entityKinds.has(kind);
}

function isAbsoluteHref(href?: string): href is string {
    return !!href && href.startsWith('/');
}

export function BreadcrumbContextBar({ breadcrumbs }: BreadcrumbContextBarProps) {
    const { t } = useI18n();

    if (breadcrumbs.length === 0) {
        return null;
    }

    const kindLabels: Record<'farm' | 'plot' | 'season', string> = {
        farm: t('breadcrumb.kind.farm', 'Farm'),
        plot: t('breadcrumb.kind.plot', 'Plot'),
        season: t('breadcrumb.kind.season', 'Season'),
    };

    return (
        <div className="sticky top-0 z-30 border-b border-border/70 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
            <nav
                aria-label={t('breadcrumb.contextAriaLabel', 'Current location')}
                className="px-4 py-2 md:px-6"
            >
                <ol className="flex min-w-0 items-center gap-1 overflow-x-auto whitespace-nowrap py-1">
                    {breadcrumbs.map((crumb, index) => {
                        const href = crumb.href;
                        const canLink = isAbsoluteHref(href);
                        const isCurrent = index === breadcrumbs.length - 1;
                        const Icon = kindIconMap[crumb.kind ?? (index === 0 ? 'portal' : 'module')];
                        const entityKind = isEntityKind(crumb.kind) ? crumb.kind : undefined;
                        const showEntityLabel = !!entityKind;
                        const content = (
                            <span
                                className={cn(
                                    'inline-flex h-8 max-w-[260px] items-center gap-1.5 rounded-md border px-2.5 text-sm transition-colors',
                                    showEntityLabel
                                        ? 'border-primary/25 bg-primary/10 text-primary'
                                        : 'border-transparent bg-transparent text-muted-foreground',
                                    isCurrent && 'border-border bg-card font-medium text-foreground shadow-sm',
                                    !isCurrent && canLink && 'hover:bg-muted hover:text-foreground',
                                )}
                            >
                                <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                                {entityKind && (
                                    <span className="text-xs font-medium uppercase text-muted-foreground">
                                        {kindLabels[entityKind]}:
                                    </span>
                                )}
                                {crumb.loading ? (
                                    <Skeleton className="h-4 w-24" />
                                ) : (
                                    <span className="truncate">{crumb.label}</span>
                                )}
                            </span>
                        );

                        return (
                            <li key={`${crumb.kind ?? 'item'}-${index}-${crumb.href ?? crumb.label}`} className="flex items-center gap-1">
                                {index > 0 && (
                                    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/60" aria-hidden="true" />
                                )}
                                {isCurrent || !canLink ? (
                                    <span aria-current={isCurrent ? 'page' : undefined}>{content}</span>
                                ) : (
                                    <Link to={href} className="min-w-0">
                                        {content}
                                    </Link>
                                )}
                            </li>
                        );
                    })}
                </ol>
            </nav>
        </div>
    );
}
