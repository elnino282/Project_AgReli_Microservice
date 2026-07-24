import { useProfileMe } from '@/entities/user';
import { useAuth } from '@/features/auth';
import type { BreadcrumbPath } from '@/features/shared/layout/types';
import { useI18n } from '@/shared/lib/hooks/useI18n';
import { useSeason } from '@/shared/contexts';
import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useFarmerBreadcrumbs } from './useFarmerBreadcrumbs';
import type { FarmerView } from '../types';

interface UseFarmerPortalShellReturn {
  currentView: FarmerView;
  setCurrentView: (view: string) => void;
  aiChatOpen: boolean;
  setAiChatOpen: (open: boolean) => void;
  userName: string;
  userEmail: string;
  breadcrumbs: BreadcrumbPath[];
  handleLogout: () => void;
}

const WORKSPACE_MODULES = new Set<string>([
  'tasks',
  'expenses',
  'field-logs',
  'disease',
  'harvest',
  'labor-management',
  'nutrient-inputs',
  'irrigation-water-analyses',
  'soil-tests',
  'reports',
]);

const resolveViewFromPath = (pathname: string): FarmerView => {
  const pathParts = pathname.split('/').filter(Boolean);

  if (pathParts[0] !== 'farmer') {
    return 'dashboard';
  }

  if (
    pathParts[1] === 'seasons' &&
    pathParts[3] === 'workspace' &&
    pathParts[4] &&
    WORKSPACE_MODULES.has(pathParts[4])
  ) {
    return 'seasons';
  }

  if (
    pathParts[1] === 'marketplace-workspace' ||
    pathParts[1] === 'marketplace-dashboard' ||
    pathParts[1] === 'marketplace-products' ||
    pathParts[1] === 'marketplace-orders'
  ) {
    return 'marketplace-workspace';
  }

  return (pathParts[1] as FarmerView) ?? 'dashboard';
};

/**
 * Custom hook for farmer portal shell state and business logic
 */
export function useFarmerPortalShell(): UseFarmerPortalShellReturn {
  const { t } = useI18n();
  const { user, logout } = useAuth();
  const { selectedSeasonId } = useSeason();
  const { data: profile } = useProfileMe();
  const navigate = useNavigate();
  const location = useLocation();
  const [currentView, setCurrentView] = useState<FarmerView>('dashboard');
  const [aiChatOpen, setAiChatOpen] = useState(false);

  /**
   * Sync currentView from URL path on mount and location changes
   */
  useEffect(() => {
    setCurrentView(resolveViewFromPath(location.pathname));
  }, [location.pathname]);

  // Get user info - prioritize React Query profile data for instant updates after mutations
  // Then fallback to session data, then extract from email, then default
  const profileFullName = profile?.fullName?.trim();
  const sessionFullName = user?.profile?.fullName?.trim();
  const emailUsername = user?.email?.split('@')[0];
  const userName = profileFullName || sessionFullName || emailUsername || t('portal.farmer');
  const userEmail = profile?.email || user?.email || 'farmer@acm-platform.com';

  const breadcrumbs = useFarmerBreadcrumbs(currentView);

  /**
   * Handle view change with URL navigation sync
   */
  const handleViewChange = (view: string): void => {
    if (view.startsWith('/')) {
      navigate(view);
      return;
    }

    if (view === 'chat') {
      navigate('/chat');
      return;
    }

    if (view === 'marketplace-workspace') {
      navigate('/farmer/marketplace-dashboard');
      return;
    }

    const targetView = view as FarmerView;
    setCurrentView(targetView);

    if (WORKSPACE_MODULES.has(targetView)) {
      if (selectedSeasonId) {
        navigate(`/farmer/seasons/${selectedSeasonId}/workspace/${targetView}`);
      } else {
        navigate('/farmer/seasons');
      }
      return;
    }

    navigate(`/farmer/${targetView}`);
  };

  /**
   * Handle user logout with navigation and toast notification
   * Also clears activeSeasonId to force season selection on next login
   */
  const handleLogout = async (): Promise<void> => {
    // Clear active season to enforce selection on next login
    localStorage.removeItem('activeSeasonId');
    await logout();
    toast.success(t('common.signedOut'));
    navigate('/sign-in', { replace: true });
  };

  return {
    currentView,
    setCurrentView: handleViewChange,
    aiChatOpen,
    setAiChatOpen,
    userName,
    userEmail,
    breadcrumbs,
    handleLogout,
  };
}



