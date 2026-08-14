import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { MarketplaceFarmerProductFormOptions, MarketplaceProductDetail } from '@/shared/api';
import { marketplaceApi } from '@/shared/api';
import { SellerProductFormPage } from './SellerProductFormPage';

// Polyfills for JSDOM limitations with Radix UI
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

if (!Element.prototype.hasPointerCapture) {
  Element.prototype.hasPointerCapture = () => false;
}
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {};
}
if (!URL.createObjectURL) {
  URL.createObjectURL = vi.fn(() => 'blob:product-image');
}
if (!URL.revokeObjectURL) {
  URL.revokeObjectURL = vi.fn();
}

vi.mock('@/shared/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/shared/api')>();
  return {
    ...actual,
    marketplaceApi: {
      ...actual.marketplaceApi,
      getFarmerProductFormOptions: vi.fn(),
      getFarmerProductDetail: vi.fn(),
      createFarmerProduct: vi.fn(),
      uploadFarmerProductImage: vi.fn(),
      updateFarmerProduct: vi.fn(),
      updateFarmerProductStatus: vi.fn(),
    },
  };
});

vi.mock('@/shared/lib/hooks/useI18n', () => ({
  useI18n: () => ({
    t: (_key: string, optionsOrDefault?: Record<string, unknown> | string) => {
      if (typeof optionsOrDefault === 'string') return optionsOrDefault;
      const defaultValue = optionsOrDefault?.defaultValue;
      if (typeof defaultValue !== 'string') return _key;
      return Object.entries(optionsOrDefault ?? {}).reduce((text, [key, value]) => {
        return text.split(`{{${key}}}`).join(String(value));
      }, defaultValue);
    },
    locale: 'en',
    languageCode: 'en',
    setLocale: vi.fn(),
    supportedLocales: ['en'],
    localeDisplayNames: {},
    isLoading: false,
  }),
}));

vi.mock('@/shared/lib/hooks/useI18n', () => ({
  useI18n: () => ({
    t: (_key: string, optionsOrDefault?: Record<string, unknown> | string) => {
      if (typeof optionsOrDefault === 'string') return optionsOrDefault;
      const defaultValue = optionsOrDefault?.defaultValue;
      if (typeof defaultValue !== 'string') return _key;
      return Object.entries(optionsOrDefault ?? {}).reduce((text, [key, value]) => {
        return text.split(`{{${key}}}`).join(String(value));
      }, defaultValue);
    },
    locale: 'en',
    languageCode: 'en',
    setLocale: vi.fn(),
    supportedLocales: ['en'],
    localeDisplayNames: {},
    isLoading: false,
  }),
}));

function formOptionsFixture(): MarketplaceFarmerProductFormOptions {
  return {
    farms: [{ id: 10, name: 'Green Valley Farm' }],
    seasons: [{ id: 20, seasonName: 'Spring 2026', farmId: 10 }],
    lots: [
      {
        id: 30,
        lotCode: 'LOT-30',
        farmId: 10,
        farmName: 'Green Valley Farm',
        seasonId: 20,
        seasonName: 'Spring 2026',
        availableQuantity: 12,
        harvestedAt: '2026-04-01T08:00:00Z',
        unit: 'kg',
        productName: 'Jasmine rice',
        productVariant: null,
        linkedProductId: null,
        linkedProductStatus: null,
      },
    ],
  };
}

function productFixture(): MarketplaceProductDetail {
  return {
    id: 99,
    slug: 'jasmine-rice',
    name: 'Jasmine rice listing',
    category: 'Grain',
    shortDescription: 'Fresh rice',
    description: 'Freshly harvested rice',
    price: 45000,
    unit: 'kg',
    stockQuantity: 6,
    availableQuantity: 6,
    shippingWeightKgPerUnit: 1,
    perishable: false,
    requiresColdChain: false,
    imageUrl: 'https://example.com/rice.jpg',
    imageUrls: [],
    farmerUserId: 7,
    farmerDisplayName: 'Farmer A',
    farmId: 10,
    farmName: 'Green Valley Farm',
    seasonId: 20,
    seasonName: 'Spring 2026',
    lotId: 30,
    region: 'Lam Dong',
    traceable: true,
    ratingAverage: 0,
    ratingCount: 0,
    status: 'REJECTED',
    statusReason: 'Missing harvest certificate',
    rejectionReason: 'Photo quality is too low',
    publishedAt: null,
    statusChangedAt: '2026-04-03T08:00:00Z',
    approvalEligible: true,
    approvalBlockers: [],
    createdAt: '2026-04-02T08:00:00Z',
    updatedAt: '2026-04-03T08:00:00Z',
    traceabilityCode: 'TRACE-99',
  };
}

function renderPage(route = '/farmer/marketplace-products/new') {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  const result = render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[route]}>
        <Routes>
          <Route path="/farmer/marketplace-products" element={<div>Products route</div>} />
          <Route path="/farmer/marketplace-products/new" element={<SellerProductFormPage />} />
          <Route path="/farmer/marketplace-products/:id/edit" element={<SellerProductFormPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
  return { ...result };
}

async function chooseOption(label: string, option: string) {
  const user = userEvent.setup();
  const trigger = screen.getByRole('combobox', { name: label });
  await user.click(trigger);
  const optionElement = await screen.findByRole('option', { name: option }, { timeout: 3000 });
  await user.click(optionElement);
}

describe('SellerProductFormPage', () => {
  beforeEach(() => {
    vi.mocked(marketplaceApi.getFarmerProductFormOptions).mockResolvedValue({ result: formOptionsFixture() } as never);
    vi.mocked(marketplaceApi.getFarmerProductDetail).mockResolvedValue({ result: productFixture() } as never);
    vi.mocked(marketplaceApi.createFarmerProduct).mockResolvedValue({ result: productFixture() } as never);
    vi.mocked(marketplaceApi.uploadFarmerProductImage).mockResolvedValue({
      result: {
        url: 'http://localhost:8080/api/v1/marketplace/product-images/uploaded.jpg',
        fileName: 'uploaded.jpg',
        contentType: 'image/jpeg',
        size: 6,
      },
    } as never);
    vi.mocked(marketplaceApi.updateFarmerProduct).mockResolvedValue({ result: productFixture() } as never);
    vi.mocked(marketplaceApi.updateFarmerProductStatus).mockResolvedValue({ result: productFixture() } as never);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('creates a harvest-backed listing end-to-end', async () => {
    renderPage();
    const user = userEvent.setup();

    await screen.findByRole('heading', { name: 'Create marketplace listing' });

    await user.type(screen.getByLabelText(/Listing name/i), 'Premium jasmine rice');
    await user.type(screen.getByLabelText(/Category/i), 'Grain');
    await user.clear(screen.getByLabelText(/Price/i));
    await user.type(screen.getByLabelText(/Price/i), '55000');
    await user.click(screen.getByRole('tab', { name: /Use URL/i }));
    await user.type(screen.getByLabelText(/Main image URL/i), 'https://example.com/premium.jpg');
    await user.type(screen.getByLabelText(/Short description/i), 'Fragrant rice from spring harvest');
    await user.type(screen.getByLabelText(/Full description/i), 'Packed after harvest with traceability enabled.');

    await chooseOption('Farm', 'Green Valley Farm');
    await chooseOption('Season', 'Spring 2026');
    await chooseOption('Harvested lot', 'LOT-30 - Jasmine rice');

    await user.clear(screen.getByLabelText(/Quantity to sell/i));
    await user.type(screen.getByLabelText(/Quantity to sell/i), '8');
    await user.type(screen.getByLabelText(/Shipping weight per unit/i), '1');
    await user.click(screen.getByRole('button', { name: 'Create draft' }));

    await waitFor(() => {
      expect(marketplaceApi.createFarmerProduct).toHaveBeenCalledWith({
        name: 'Premium jasmine rice',
        category: 'Grain',
        shortDescription: 'Fragrant rice from spring harvest',
        description: 'Packed after harvest with traceability enabled.',
        price: 55000,
        stockQuantity: 8,
        shippingWeightKgPerUnit: 1,
        perishable: false,
        requiresColdChain: false,
        imageUrl: 'https://example.com/premium.jpg',
        lotId: 30,
      });
    });
    expect(marketplaceApi.uploadFarmerProductImage).not.toHaveBeenCalled();
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/farmer/marketplace-products');
    });
  }, 10000);

  it('uploads a selected product image before creating the listing', async () => {
    renderPage();
    const user = userEvent.setup();
    const image = new File(['durian'], 'durian.jpg', { type: 'image/jpeg' });

    await screen.findByRole('heading', { name: 'Create marketplace listing' });

    await user.type(screen.getByLabelText(/Listing name/i), 'Durian harvest');
    await user.type(screen.getByLabelText(/Category/i), 'Fruit');
    await user.clear(screen.getByLabelText(/Price/i));
    await user.type(screen.getByLabelText(/Price/i), '50000');
    await user.upload(screen.getByLabelText(/Product image file/i), image);
    await chooseOption('Farm', 'Green Valley Farm');
    await chooseOption('Season', 'Spring 2026');
    await chooseOption('Harvested lot', 'LOT-30 - Jasmine rice');
    await user.clear(screen.getByLabelText(/Quantity to sell/i));
    await user.type(screen.getByLabelText(/Quantity to sell/i), '3');
    await user.type(screen.getByLabelText(/Shipping weight per unit/i), '2.5');

    await user.click(screen.getByRole('button', { name: 'Create draft' }));

    await waitFor(() => {
      expect(marketplaceApi.uploadFarmerProductImage).toHaveBeenCalledWith(image);
      expect(marketplaceApi.createFarmerProduct).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Durian harvest',
          imageUrl: 'http://localhost:8080/api/v1/marketplace/product-images/uploaded.jpg',
          lotId: 30,
        }),
      );
    });
  }, 10000);

  it('rejects unsupported product image files before upload', async () => {
    renderPage();
    const user = userEvent.setup({ applyAccept: false });
    const textFile = new File(['not image'], 'durian.txt', { type: 'text/plain' });

    await screen.findByRole('heading', { name: 'Create marketplace listing' });
    await user.upload(screen.getByLabelText(/Product image file/i), textFile);

    expect(await screen.findByText('Only JPG, PNG, or WEBP product images are supported.')).toBeInTheDocument();
    expect(marketplaceApi.uploadFarmerProductImage).not.toHaveBeenCalled();
  });

  it('blocks listing quantity that exceeds selected lot availability', async () => {
    renderPage();
    const user = userEvent.setup();

    await screen.findByRole('heading', { name: 'Create marketplace listing' });

    await user.type(screen.getByLabelText(/Listing name/i), 'Premium jasmine rice');
    await user.clear(screen.getByLabelText(/Price/i));
    await user.type(screen.getByLabelText(/Price/i), '55000');
    await chooseOption('Farm', 'Green Valley Farm');
    await chooseOption('Season', 'Spring 2026');
    await chooseOption('Harvested lot', 'LOT-30 - Jasmine rice');

    await user.clear(screen.getByLabelText(/Quantity to sell/i));
    await user.type(screen.getByLabelText(/Quantity to sell/i), '13');
    await user.type(screen.getByLabelText(/Shipping weight per unit/i), '1');

    expect(screen.getByRole('button', { name: 'Create draft' })).toBeDisabled();
    expect(marketplaceApi.createFarmerProduct).not.toHaveBeenCalled();
  }, 10000);

  it('shows admin rejection reason when editing a rejected listing', async () => {
    renderPage('/farmer/marketplace-products/99/edit');

    expect(await screen.findByText('Admin reason: Missing harvest certificate')).toBeInTheDocument();
  });
});

