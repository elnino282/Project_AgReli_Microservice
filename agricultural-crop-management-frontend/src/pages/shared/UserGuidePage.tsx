import React from 'react';
import { UserGuideContent } from '@/features/shared/user-guide';
import { PortalType } from '@/widgets/layout/model/types';
import { useLocation } from 'react-router-dom';

export function UserGuidePage() {
    const location = useLocation();
    
    // Determine portal type from path
    let portalType: PortalType | undefined;
    if (location.pathname.startsWith('/farmer')) {
        portalType = 'FARMER';
    } else if (location.pathname.startsWith('/employee')) {
        portalType = 'EMPLOYEE';
    } else if (location.pathname.startsWith('/admin')) {
        portalType = 'ADMIN';
    }

    return <UserGuideContent portalType={portalType} />;
}
