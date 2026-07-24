import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type React from "react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { FarmStorePage } from "./FarmStorePage";
import type {
  MarketplaceFarmDetail,
  MarketplaceProductPage,
  MarketplaceReviewPage,
} from "@/shared/api";
import {
  useMarketplaceAddToCart,
  useMarketplaceFarmDetail,
  useMarketplaceFarmReviews,
  useMarketplaceProducts,
} from "@/features/marketplace/hooks";

const authMock = vi.hoisted(() => ({
  isAuthenticated: true,
  user: { id: 91, role: "buyer" },
}));

vi.mock("@/features/auth", () => ({
  useAuth: () => authMock,
}));

vi.mock("@/shared/ui", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/shared/ui")>();
  return {
    ...actual,
    Button: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
      <button type="button" {...props}>
        {children}
      </button>
    ),
  };
});

vi.mock("@/features/marketplace/hooks", () => ({
  useMarketplaceAddToCart: vi.fn(),
  useMarketplaceFarmDetail: vi.fn(),
  useMarketplaceFarmReviews: vi.fn(),
  useMarketplaceProducts: vi.fn(),
}));

const mockedUseMarketplaceAddToCart = vi.mocked(useMarketplaceAddToCart);
const mockedUseMarketplaceFarmDetail = vi.mocked(useMarketplaceFarmDetail);
const mockedUseMarketplaceFarmReviews = vi.mocked(useMarketplaceFarmReviews);
const mockedUseMarketplaceProducts = vi.mocked(useMarketplaceProducts);

function farmFixture(overrides: Partial<MarketplaceFarmDetail> = {}): MarketplaceFarmDetail {
  return {
    id: 4,
    name: "Nong trai Alpha",
    region: "Lam Dong",
    address: "Ward 1, Lam Dong",
    coverImageUrl: "/farm-cover.jpg",
    productCount: 1,
    description: "Fresh farm products",
    ownerUserId: 17,
    ownerDisplayName: "Farmer Alpha",
    contactPhone: "0909000000",
    active: true,
    ratingAverage: 4.6,
    ratingCount: 8,
    hasTraceableProducts: true,
    ...overrides,
  };
}

function productPageFixture(overrides: Partial<MarketplaceProductPage> = {}): MarketplaceProductPage {
  return {
    items: [
      {
        id: 10,
        slug: "alpha-rice",
        name: "Alpha Rice",
        category: "RICE",
        shortDescription: "Fresh rice",
        price: 45000,
        unit: "kg",
        stockQuantity: 40,
        availableQuantity: 30,
        imageUrl: "/alpha-rice.jpg",
        farmerUserId: 17,
        farmerDisplayName: "Farmer Alpha",
        farmId: 4,
        farmName: "Nong trai Alpha",
        seasonId: 3,
        seasonName: "Spring",
        lotId: 5,
        region: "Lam Dong",
        traceable: true,
        ratingAverage: 4.5,
        ratingCount: 4,
        status: "ACTIVE",
        statusReason: null,
        rejectionReason: null,
        publishedAt: "2026-05-01T00:00:00Z",
        statusChangedAt: "2026-05-01T00:00:00Z",
        approvalEligible: true,
        approvalBlockers: [],
        createdAt: "2026-05-01T00:00:00Z",
        updatedAt: "2026-05-01T00:00:00Z",
      },
    ],
    page: 0,
    size: 24,
    totalElements: 1,
    totalPages: 1,
    ...overrides,
  };
}

function emptyProductPage(): MarketplaceProductPage {
  return productPageFixture({
    items: [],
    totalElements: 0,
    totalPages: 0,
  });
}

function reviewPageFixture(): MarketplaceReviewPage {
  return {
    items: [],
    page: 0,
    size: 3,
    totalElements: 0,
    totalPages: 0,
  };
}

function renderFarmStore() {
  return render(
    <MemoryRouter initialEntries={["/marketplace/farms/4"]}>
      <Routes>
        <Route path="/marketplace/farms/:farmId" element={<FarmStorePage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("FarmStorePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMock.isAuthenticated = true;
    authMock.user = { id: 91, role: "buyer" };
    mockedUseMarketplaceAddToCart.mockReturnValue({
      addToCart: vi.fn(),
      isAdding: false,
    } as never);
    mockedUseMarketplaceFarmDetail.mockReturnValue({
      isLoading: false,
      isError: false,
      data: farmFixture(),
    } as never);
    mockedUseMarketplaceProducts.mockReturnValue({
      isLoading: false,
      isError: false,
      data: productPageFixture(),
    } as never);
    mockedUseMarketplaceFarmReviews.mockReturnValue({
      isLoading: false,
      isError: false,
      data: reviewPageFixture(),
    } as never);
  });

  it("requests products scoped to the current farm and renders only real product links", async () => {
    const { container } = renderFarmStore();

    await waitFor(() => {
      expect(mockedUseMarketplaceProducts).toHaveBeenCalledWith(
        expect.objectContaining({ farmId: 4, page: 0, size: 24, sort: "newest" }),
      );
    });

    expect(screen.getByText("Alpha Rice")).toBeInTheDocument();
    expect(container.querySelector('a[href="#"]')).toBeNull();
    expect(container.querySelector('a[href="/marketplace/products/alpha-rice"]')).not.toBeNull();
    expect(container.querySelector('a[href*="-100"]')).toBeNull();
    expect(screen.queryByText(/2-4 ngày/i)).not.toBeInTheDocument();
  });

  it("shows a real empty state when the farm has no products", () => {
    mockedUseMarketplaceProducts.mockReturnValue({
      isLoading: false,
      isError: false,
      data: emptyProductPage(),
    } as never);

    renderFarmStore();

    expect(screen.getByText("Chưa có sản phẩm")).toBeInTheDocument();
    expect(screen.getByText("Nông trại chưa đăng bán sản phẩm nào trên marketplace.")).toBeInTheDocument();
    expect(screen.queryByText("Alpha Rice")).not.toBeInTheDocument();
  });

  it("triggers open-chat-widget custom event with the farm owner user ID when clicking message", () => {
    const dispatchSpy = vi.spyOn(window, "dispatchEvent");
    renderFarmStore();

    const messageBtn = screen.getByRole("button", { name: /nhắn tin/i });
    expect(messageBtn).toBeInTheDocument();

    fireEvent.click(messageBtn);

    expect(dispatchSpy).toHaveBeenCalled();
    const event = dispatchSpy.mock.calls.find(
      (call) => call[0] instanceof CustomEvent && (call[0] as CustomEvent).type === "open-chat-widget"
    )?.[0] as CustomEvent;

    expect(event).toBeDefined();
    expect(event.detail).toEqual({ peerUserId: 17 });

    dispatchSpy.mockRestore();
  });

  it("disables the message action when the current user owns the farm", () => {
    authMock.user = { id: 17, role: "farmer" };

    renderFarmStore();

    expect(screen.getByRole("button", { name: /đây là nông trại của bạn/i })).toBeDisabled();
  });
});
