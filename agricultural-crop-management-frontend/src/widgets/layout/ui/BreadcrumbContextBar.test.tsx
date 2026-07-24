import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import { BreadcrumbContextBar } from './BreadcrumbContextBar';

vi.mock('@/shared/lib/hooks/useI18n', () => ({
    useI18n: () => ({
        t: (_key: string, defaultValue?: string) => defaultValue ?? _key,
    }),
}));

describe('BreadcrumbContextBar', () => {
    it('renders the full portal, module, and entity trail', () => {
        render(
            <MemoryRouter>
                <BreadcrumbContextBar
                    breadcrumbs={[
                        { label: 'Farmer Portal', href: '/farmer/dashboard', kind: 'portal' },
                        { label: 'Seasons', href: '/farmer/seasons', kind: 'module' },
                        { label: 'Trang trai A', href: '/farmer/farms/12', kind: 'farm' },
                        { label: 'Lo 1', kind: 'plot' },
                        { label: 'He Thu 2026', kind: 'season' },
                    ]}
                />
            </MemoryRouter>,
        );

        expect(screen.getByRole('navigation', { name: /current location/i })).toBeInTheDocument();
        expect(screen.getByRole('link', { name: /farmer portal/i })).toHaveAttribute('href', '/farmer/dashboard');
        expect(screen.getByText('Seasons')).toBeInTheDocument();
        expect(screen.getByText('Farm:')).toBeInTheDocument();
        expect(screen.getByText('Trang trai A')).toBeInTheDocument();
        expect(screen.getByText('Plot:')).toBeInTheDocument();
        expect(screen.getByText('Lo 1')).toBeInTheDocument();
        expect(screen.getByText('Season:')).toBeInTheDocument();
        expect(screen.getByText('He Thu 2026')).toBeInTheDocument();
    });
});
