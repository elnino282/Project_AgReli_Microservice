import { Monitor, Moon, Sun } from 'lucide-react';
import { useTheme } from '@/shared/lib/hooks/useTheme';
import { cn } from '@/shared/lib';
import { Button } from '@/shared/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu';

interface ThemeToggleProps {
  className?: string;
  align?: 'start' | 'center' | 'end';
}

export function ThemeToggle({ className, align = 'end' }: ThemeToggleProps) {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const Icon = theme === 'system' ? Monitor : theme === 'dark' ? Moon : Sun;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className={cn('shrink-0', className)} aria-label="Đổi giao diện">
          <Icon className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align} className="w-40">
        <DropdownMenuRadioGroup value={theme} onValueChange={(value) => setTheme(value as 'light' | 'dark' | 'system')}>
          <DropdownMenuRadioItem value="light"><Sun className="mr-2 h-4 w-4" />Sáng</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="dark"><Moon className="mr-2 h-4 w-4" />Tối</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="system" className="justify-between">
            <span className="inline-flex items-center"><Monitor className="mr-2 h-4 w-4" />Hệ thống</span>
            <span className="text-xs text-muted-foreground">{resolvedTheme}</span>
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
