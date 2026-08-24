import type { LucideIcon } from 'lucide-react';
import { CardHeader, CardTitle } from '@/shared/ui/card';
import { cn } from '@/shared/lib';

export type SectionCardHeaderProps = {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  iconChipClassName?: string;
  className?: string;
};

export function SectionCardHeader({
  icon: Icon,
  title,
  subtitle,
  iconChipClassName,
  className,
}: SectionCardHeaderProps) {
  return (
    <CardHeader className={cn('pb-4', className)}>
      <div className="flex items-start gap-3">
        <div
          className={cn(
            'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100',
            iconChipClassName
          )}
        >
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <CardTitle className="text-base font-semibold text-slate-900">
            {title}
          </CardTitle>
          {subtitle && (
            <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>
          )}
        </div>
      </div>
    </CardHeader>
  );
}
