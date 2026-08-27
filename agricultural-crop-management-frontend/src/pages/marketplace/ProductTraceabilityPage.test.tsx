import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import { ProductTraceabilityPage } from './ProductTraceabilityPage';

function CurrentLocation() {
  const location = useLocation();
  return <span data-testid="location">{location.pathname}</span>;
}

describe('ProductTraceabilityPage', () => {
  it('redirects the legacy product trace route to the canonical public trace route', () => {
    render(
      <MemoryRouter initialEntries={['/marketplace/products/rice-lot-01/trace']}>
        <Routes>
          <Route path="/marketplace/products/:slug/trace" element={<ProductTraceabilityPage />} />
          <Route path="/trace/:slug" element={<CurrentLocation />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByTestId('location')).toHaveTextContent('/trace/rice-lot-01');
  });
});
