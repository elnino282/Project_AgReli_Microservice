import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { MarketplaceOrder } from '@/shared/api';
import { marketplaceApi } from '@/shared/api';
import { OrderDetailPage } from './OrderDetailPage';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
  initReactI18next: { type: '3rdParty', init: vi.fn() },
}));

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

vi.mock('@/shared/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/shared/api')>();
  return {
    ...actual,
    marketplaceApi: {
      getOrderDetail: vi.fn(),
      uploadOrderPaymentProof: vi.fn(),
      createReview: vi.fn(),
      cancelOrder: vi.fn(),
    },
  };
});

function orderFixture(): MarketplaceOrder {
  return {
    id: 55,
    orderCode: 'ORD-55',
    orderGroupCode: 'GRP-1',
    buyerUserId: 1,
    farmerUserId: 2,
    status: 'COMPLETED',
    payment: {
      method: 'BANK_TRANSFER',
      verificationStatus: 'REJECTED',
      proofFileName: null,
      proofContentType: null,
      proofStoragePath: null,
      proofUploadedAt: null,
      verifiedAt: null,
      verifiedBy: null,
      verificationNote: 'Ảnh không rõ',
    },
    shippingRecipientName: 'Nguyen Van A',
    shippingPhone: '0912345678',
    shippingAddressLine: '1 Nguyen Trai, HCM',
    note: null,
    subtotal: 100_000,
    shippingFee: 20_000,
    totalAmount: 120_000,
    canCancel: false,
    createdAt: '2026-05-01T10:00:00Z',
    updatedAt: '2026-05-01T10:00:00Z',
    items: [{
      id: 1,
      productId: 10,
      productName: 'Rice',
      productSlug: 'rice',
      imageUrl: '/rice.png',
      unitPriceSnapshot: 50_000,
      quantity: 2,
      lineTotal: 100_000,
      traceableSnapshot: true,
      canReview: true,
      reviewId: null,
    }],
  };
}

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={["/marketplace/orders/55"]}>
        <Routes><Route path="/marketplace/orders/:id" element={children} /></Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
  return render(<OrderDetailPage />, { wrapper: Wrapper });
}

describe('OrderDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows order items, address, rejected payment status, upload, and review form', async () => {
    vi.mocked(marketplaceApi.getOrderDetail).mockResolvedValue({ result: orderFixture() } as never);

    renderPage();

    expect(await screen.findByText('ORD-55')).toBeInTheDocument();
    expect(screen.getByText('Rice')).toBeInTheDocument();
    expect(screen.getByText('Nguyen Van A')).toBeInTheDocument();
    expect(screen.getByText(/BANK_TRANSFER \u00B7 .*REJECTED/)).toBeInTheDocument();
    expect(screen.getByText('marketplaceBuyer.orderDetail.transferProofTitle')).toBeInTheDocument();
    expect(screen.getByText('marketplaceBuyer.orderDetail.rateProduct')).toBeInTheDocument();
  });

  it('blocks invalid payment proof file types', async () => {
    const { toast } = await import('sonner');
    vi.mocked(marketplaceApi.getOrderDetail).mockResolvedValue({ result: orderFixture() } as never);

    renderPage();

    const input = await screen.findByLabelText(/payment proof/i, { selector: 'input' }).catch(() => screen.getByTestId('payment-proof-input'));
    const file = new File(['bad'], 'bad.txt', { type: 'text/plain' });

    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(vi.mocked(toast.error)).toHaveBeenCalledWith('Chỉ hỗ trợ JPG, PNG, WEBP hoặc PDF.');
    });
    expect(vi.mocked(marketplaceApi.uploadOrderPaymentProof)).not.toHaveBeenCalled();
  });

  it('uploads valid payment proof file', async () => {
    const { toast } = await import('sonner');
    vi.mocked(marketplaceApi.getOrderDetail).mockResolvedValue({ result: orderFixture() } as never);
    vi.mocked(marketplaceApi.uploadOrderPaymentProof).mockResolvedValue({ result: null } as never);
    const user = userEvent.setup();

    renderPage();

    const input = await screen.findByLabelText(/payment proof/i, { selector: 'input' }).catch(() => screen.getByTestId('payment-proof-input'));
    const file = new File(['image'], 'proof.jpg', { type: 'image/jpeg' });
    await user.upload(input, file);

    const uploadButton = screen.getByRole('button', { name: /marketplaceBuyer.orderDetail.uploadProof/i });
    await user.click(uploadButton);

    expect(vi.mocked(marketplaceApi.uploadOrderPaymentProof)).toHaveBeenCalledWith(55, file);
    expect(vi.mocked(toast.success)).toHaveBeenCalledWith('Tải lên xác nhận thanh toán thành công.');
  });

  it('submits product review', async () => {
    const { toast } = await import('sonner');
    vi.mocked(marketplaceApi.getOrderDetail).mockResolvedValue({ result: orderFixture() } as never);
    vi.mocked(marketplaceApi.createReview).mockResolvedValue({ result: null } as never);
    const user = userEvent.setup();

    renderPage();

    await screen.findByText('ORD-55');

    const stars = screen.getAllByRole('button').filter(btn => btn.textContent === '★');
    await user.click(stars[4]);

    const commentInput = screen.getByPlaceholderText('marketplaceBuyer.orderDetail.reviewPlaceholder');
    await user.type(commentInput, 'Great product!');

    const submitButton = screen.getByRole('button', { name: /marketplaceBuyer.orderDetail.submitReview/i });
    await user.click(submitButton);

    expect(vi.mocked(marketplaceApi.createReview)).toHaveBeenCalledWith({
      orderId: 55,
      orderItemId: 1,
      rating: 5,
      comment: 'Great product!',
    });
    expect(vi.mocked(toast.success)).toHaveBeenCalledWith('Đánh giá đã được gửi thành công.');
  });
});
