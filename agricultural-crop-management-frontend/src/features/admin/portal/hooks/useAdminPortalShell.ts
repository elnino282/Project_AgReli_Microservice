import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { useProfileMe } from '@/entities/user';
import { useAuth } from '@/features/auth';
import { useI18n } from '@/shared/lib/hooks/useI18n';

import { ADMIN_VIEW_CONFIG } from '../constants';
import { useAdminBreadcrumbs } from './useAdminBreadcrumbs';
import type { AdminView } from '../types';

const LEGACY_ADMIN_VIEW_REDIRECTS: Record<string, string> = {
  buyers: '/admin/users-roles?tab=users&role=BUYER',
  farmers: '/admin/users-roles?tab=users&role=FARMER',
  'farm-documents': '/admin/cert-audits',
};

export function useAdminPortalShell(initialView: AdminView = 'dashboard') {
  const { user, logout } = useAuth();
  const { t } = useI18n();
  const { data: profile } = useProfileMe();
  const navigate = useNavigate();
  const location = useLocation();

  const [currentView, setCurrentView] = useState<AdminView>(initialView);
  const [aiChatOpen, setAiChatOpen] = useState(false);

  // Get user info - prioritize React Query profile data for instant updates after mutations
  // Then fallback to session data, then extract from email, then default
  const profileFullName = profile?.fullName?.trim();
  const sessionFullName = user?.profile?.fullName?.trim();
  const emailUsername = user?.email?.split('@')[0];
  const userName = profileFullName || sessionFullName || emailUsername || 'Admin';
  const userEmail = profile?.email || user?.email || 'admin@acm-platform.com';

  const handleLogout = () => {
    logout();
    toast.success(t('common.signedOut'));
    navigate('/signin', { replace: true });
  };

  const breadcrumbs = useAdminBreadcrumbs(currentView);

  useEffect(() => {
    const segments = location.pathname.split('/').filter(Boolean);
    const viewSegment = segments[0] === 'admin' ? segments[1] : undefined;
    if (viewSegment && viewSegment in LEGACY_ADMIN_VIEW_REDIRECTS) {
      navigate(LEGACY_ADMIN_VIEW_REDIRECTS[viewSegment], { replace: true });
      return;
    }

    if (viewSegment && viewSegment in ADMIN_VIEW_CONFIG) {
      const resolvedView = viewSegment as AdminView;
      if (resolvedView !== currentView) {
        setCurrentView(resolvedView);
      }
    }
  }, [location.pathname, currentView, navigate]);

  const handleViewChange = (view: AdminView) => {
    setCurrentView(view);
    navigate(`/admin/${view}`);
  };

  return {
    // State
    currentView,
    aiChatOpen,

    // Derived Data
    breadcrumbs,
    userName,
    userEmail,

    // Handlers
    handleViewChange,
    setAiChatOpen,
    handleLogout,
  };
}
