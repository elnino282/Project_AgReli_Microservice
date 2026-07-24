import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { MarketplaceOrder, MarketplaceOrderStatus } from '@/shared/api';
import { marketplaceApi } from '@/shared/api';
import { SellerOrderDetailPage } from './SellerOrderDetailPage';

vi.mock('@/shared/lib/hooks/useI18n', () => ({
  useI18n: () => ({
    locale: 'en-US',
    t: (key: string, optionsOrDefault?: Record<string, unknown> | string) => {
      if (typeof optionsOrDefault === 'string') {
        return optionsOrDefault;
      }
      if (typeof optionsOrDefault?.defaultValue === 'string') {
        return optionsOrDefault.defaultValue.replace(
          /\{\{(\w+)\}\}/g,
          (_match, name: string) => String(optionsOrDefault[name] ?? ''),
        );
      }

      const dictionary: Record<string, string> = {
        'marketplaceSeller.status.order.PENDING_PAYMENT': 'Pending payment',
        'marketplaceSeller.status.order.PAYMENT_SUBMITTED': 'Payment submitted',
        'marketplaceSeller.status.order.PAYMENT_VERIFIED': 'Payment verified',
        'marketplaceSeller.status.order.CONFIRMED': 'Confirmed',
        'marketplaceSeller.status.order.PREPARING': 'Preparing',
        'marketplaceSeller.status.order.SHIPPED': 'Shipped',
        'marketplaceSeller.status.order.DELIVERED': 'Delivered',
        'marketplaceSeller.status.order.COMPLETED': 'Completed',
        'marketplaceSeller.status.order.REJECTED': 'Rejected',
        'marketplaceSeller.status.order.CANCELLED': 'Cancelled',
        'marketplaceSeller.status.order.PENDING': 'Pending payment',
        'marketplaceSeller.status.order.DELIVERING': 'Shipped',
        'marketplaceSeller.orderDetail.verificationStatus.notRequired': 'Not required',
      };

      return dictionary[key] ?? key;
    },
  }),
}));

vi.mock('@/shared/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/shared/api')>();
  return {
    ...actual,
    marketplaceApi: {
      ...actual.marketplaceApi,
      getFarmerOrderDetail: vi.fn(),
      updateFarmerOrderStatus: vi.fn(),
    },
  };
});

function orderFixture(status: MarketplaceOrderStatus): MarketplaceOrder {
  return {
    id: 77,
    orderCode: 'ORD-77',
    orderGroupCode: 'GRP-77',
    buyerUserId: 5,
    farmerUserId: 7,
    status,
    payment: {
      method: 'COD',
      verificationStatus: 'NOT_REQUIRED',
      proofFileName: null,
      proofContentType: null,
      proofStoragePath: null,
      proofUploadedAt: null,
      verifiedAt: null,
      verifiedBy: null,
      verificationNote: null,
    },
    shippingRecipientName: 'Buyer Nguyen',
    shippingPhone: '0900000000',
    shippingAddressLine: '123 Farm Road',
    note: 'Leave at gate',
    subtotal: 100000,
    shippingFee: 20000,
    totalAmount: 120000,
    canCancel: true,
    createdAt: '2026-04-04T08:00:00Z',
    updatedAt: '2026-04-04T09:00:00Z',
    items: [
      {
        id: 1,
        productId: 99,
        productName: 'Premium jasmine rice',
        productSlug: 'premium-jasmine-rice',
        imageUrl: 'https://example.com/rice.jpg',
        unitPriceSnapshot: 50000,
        quantity: 2,
        lineTotal: 100000,
        traceableSnapshot: true,
        canReview: false,
        reviewId: null,
      },
    ],
  };
}

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/farmer/marketplace-orders/77']}>
        <Routes>
          <Route path="/farmer/marketplace-orders/:id" element={<SellerOrderDetailPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('SellerOrderDetailPage', () => {
  beforeEach(() => {
    vi.mocked(marketplaceApi.updateFarmerOrderStatus).mockResolvedValue({ result: orderFixture('CONFIRMED') } as never);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('confirms a payment-verified farmer order end-to-end', async () => {
    vi.mocked(marketplaceApi.getFarmerOrderDetail).mockResolvedValue({ result: orderFixture('PAYMENT_VERIFIED') } as never);
    renderPage();
    const user = userEvent.setup();

    expect(await screen.findByRole('heading', { name: 'ORD-77' })).toBeInTheDocument();
    expect(screen.getByText('Buyer Nguyen')).toBeInTheDocument();
    expect(screen.getByText('Premium jasmine rice')).toBeInTheDocument();
    expect(screen.getByText(/Verification: Not required/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Confirmed' }));

    await waitFor(() => {
      expect(marketplaceApi.updateFarmerOrderStatus).toHaveBeenCalledWith(77, { status: 'CONFIRMED' });
    });
  });

  it('marks a preparing farmer order as shipped end-to-end', async () => {
    vi.mocked(marketplaceApi.getFarmerOrderDetail).mockResolvedValue({ result: orderFixture('PREPARING') } as never);
    vi.mocked(marketplaceApi.updateFarmerOrderStatus).mockResolvedValue({ result: orderFixture('SHIPPED') } as never);
    renderPage();
    const user = userEvent.setup();

    expect(await screen.findByRole('heading', { name: 'ORD-77' })).toBeInTheDocument();

    // Wait for the Shipped button to appear (which means the page loaded with PREPARING status)
    const shippedButton = await screen.findByRole('button', { name: 'Shipped' });
    await user.click(shippedButton);

    await waitFor(() => {
      expect(marketplaceApi.updateFarmerOrderStatus).toHaveBeenCalledWith(77, { status: 'SHIPPED' });
    });
  });
});

