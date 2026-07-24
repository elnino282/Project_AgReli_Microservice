import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SellerMarketplaceTabs } from "@/features/marketplace/layout";
import { SellerOrdersPage } from "./SellerOrdersPage";
import { SellerProductsPage } from "./SellerProductsPage";
import * as marketplaceHooks from "@/features/marketplace/hooks";
import type {
  MarketplaceOrder,
  MarketplaceOrderPage,
  MarketplaceProductPage,
  MarketplaceProductSummary,
} from "@/shared/api";

vi.mock("@/features/marketplace/hooks");

vi.mock("@/shared/lib/hooks/useI18n", () => {
  const labels: Record<string, string> = {
    "marketplaceSeller.tabs.ariaLabel": "Không gian bán hàng",
    "marketplaceSeller.tabs.brand": "Bán hàng",
    "marketplaceSeller.tabs.title": "Workspace bán hàng",
    "marketplaceSeller.tabs.items.overview.label": "Tổng quan",
    "marketplaceSeller.tabs.items.overview.description": "Tóm tắt cửa hàng",
    "marketplaceSeller.tabs.items.products.label": "Sản phẩm",
    "marketplaceSeller.tabs.items.products.description": "Danh sách và tồn kho",
    "marketplaceSeller.tabs.items.orders.label": "Đơn hàng",
    "marketplaceSeller.tabs.items.orders.description": "Đơn mua từ khách",
    "marketplaceSeller.products.title": "Quản lý sản phẩm",
    "marketplaceSeller.products.subtitle": "Đăng bán, kiểm duyệt và quản lý tồn kho sản phẩm trên sàn.",
    "marketplaceSeller.products.addProduct": "Thêm sản phẩm",
    "marketplaceSeller.products.searchLabel": "Tìm sản phẩm",
    "marketplaceSeller.products.searchPlaceholder": "Tìm theo tên, mô tả hoặc danh mục...",
    "marketplaceSeller.products.statusLabel": "Trạng thái",
    "marketplaceSeller.products.mobileListLabel": "Danh sách sản phẩm dạng thẻ",
    "marketplaceSeller.products.emptyTitle": "Chưa có sản phẩm phù hợp",
    "marketplaceSeller.products.emptyDescription": "Thử đổi bộ lọc hoặc thêm sản phẩm mới để khách hàng có thể đặt mua.",
    "marketplaceSeller.products.loading": "Đang tải sản phẩm...",
    "marketplaceSeller.products.loadError": "Không thể tải danh sách sản phẩm.",
    "marketplaceSeller.filters.allStatuses": "Tất cả trạng thái",
    "marketplaceSeller.status.draft": "Bản nháp",
    "marketplaceSeller.status.pendingReview": "Chờ duyệt",
    "marketplaceSeller.status.published": "Đã duyệt",
    "marketplaceSeller.status.hidden": "Đã ẩn",
    "marketplaceSeller.status.soldOut": "Hết hàng",
    "marketplaceSeller.table.product": "Sản phẩm",
    "marketplaceSeller.table.category": "Danh mục",
    "marketplaceSeller.table.price": "Giá",
    "marketplaceSeller.table.stock": "Tồn kho",
    "marketplaceSeller.table.status": "Trạng thái",
    "marketplaceSeller.table.updated": "Cập nhật",
    "marketplaceSeller.table.actions": "Thao tác",
    "marketplaceSeller.table.available": "Khả dụng",
    "marketplaceSeller.table.adminReason": "Lý do từ quản trị",
    "marketplaceSeller.products.actions.hide": "Ẩn sản phẩm",
    "marketplaceSeller.products.actions.show": "Hiện sản phẩm",
    "marketplaceSeller.products.actions.edit": "Sửa sản phẩm",
    "marketplaceSeller.orders.title": "Quản lý đơn hàng",
    "marketplaceSeller.orders.subtitle": "Theo dõi đơn mua, trạng thái xử lý và mở chi tiết để giao hàng.",
    "marketplaceSeller.orders.mobileListLabel": "Danh sách đơn hàng dạng thẻ",
    "marketplaceSeller.orders.filters.all": "Tất cả",
    "marketplaceSeller.orders.filters.ariaLabel": "Lọc trạng thái đơn hàng",
    "marketplaceSeller.orders.filters.label": "Lọc đơn hàng",
    "marketplaceSeller.orders.table.orderCode": "Mã đơn",
    "marketplaceSeller.orders.table.orderDate": "Ngày đặt",
    "marketplaceSeller.orders.table.customer": "Khách hàng",
    "marketplaceSeller.orders.table.total": "Tổng tiền",
    "marketplaceSeller.orders.table.status": "Trạng thái",
    "marketplaceSeller.orders.table.actions": "Thao tác",
    "marketplaceSeller.orders.table.detail": "Chi tiết",
    "marketplaceSeller.orders.empty": "Chưa có đơn hàng phù hợp với bộ lọc.",
    "marketplaceSeller.orders.error": "Không thể tải danh sách đơn hàng.",
    "marketplaceSeller.status.order.PENDING_PAYMENT": "Chờ thanh toán",
  };

  return {
    useI18n: () => ({
      locale: "vi-VN",
      t: (key: string, optionsOrDefault?: Record<string, unknown> | string) => {
        if (labels[key]) return labels[key];
        if (typeof optionsOrDefault === "string") return optionsOrDefault;
        if (optionsOrDefault?.defaultValue && typeof optionsOrDefault.defaultValue === "string") {
          return optionsOrDefault.defaultValue.replace("{{id}}", String(optionsOrDefault.id ?? ""));
        }
        return key;
      },
    }),
  };
});

const product: MarketplaceProductSummary = {
  id: 10,
  slug: "soybean-ags398-2026",
  name: "Đậu nành AGS398 sấy khô 2026",
  shortDescription: "Lô hàng ít tồn cho cảnh báo bán hàng.",
  imageUrl: "https://example.com/soybean.jpg",
  category: "SOYBEAN",
  price: 145000,
  unit: "kg",
  stockQuantity: 7,
  availableQuantity: 7,
  farmerUserId: 1,
  farmerDisplayName: "Nguyen Van Farmer",
  farmId: 2,
  farmName: "Nông trại xanh",
  seasonId: 3,
  seasonName: "Mùa hè thu 2026",
  lotId: 4,
  region: "Đồng Tháp",
  traceable: true,
  ratingAverage: 0,
  ratingCount: 0,
  status: "ACTIVE",
  statusReason: null,
  rejectionReason: null,
  publishedAt: "2026-06-09T16:00:00.000Z",
  statusChangedAt: "2026-06-09T16:00:00.000Z",
  approvalEligible: true,
  approvalBlockers: [],
  createdAt: "2026-06-09T16:00:00.000Z",
  updatedAt: "2026-06-09T16:41:00.000Z",
};

const order: MarketplaceOrder = {
  id: 20,
  orderCode: "ORD-2026-001",
  orderGroupCode: "GRP-2026-001",
  buyerUserId: 5,
  farmerUserId: 1,
  status: "PENDING_PAYMENT",
  payment: {
    method: "COD",
    verificationStatus: "NOT_REQUIRED",
    proofFileName: null,
    proofContentType: null,
    proofStoragePath: null,
    proofUploadedAt: null,
    verifiedAt: null,
    verifiedBy: null,
    verificationNote: null,
  },
  shippingRecipientName: "Nguyen Buyer",
  shippingPhone: "0900000000",
  shippingAddressLine: "123 Market Street",
  note: null,
  subtotal: 580000,
  shippingFee: 0,
  totalAmount: 580000,
  canCancel: true,
  createdAt: "2026-06-09T09:00:00.000Z",
  updatedAt: "2026-06-09T09:00:00.000Z",
  items: [],
};

function productPage(items: MarketplaceProductSummary[]): MarketplaceProductPage {
  return { items, totalPages: items.length > 0 ? 1 : 0, totalElements: items.length, page: 0, size: 100 };
}

function orderPage(items: MarketplaceOrder[]): MarketplaceOrderPage {
  return { items, totalPages: items.length > 0 ? 1 : 0, totalElements: items.length, page: 0, size: 50 };
}

function renderWithRouter(ui: React.ReactElement, route = "/farmer/marketplace-products") {
  return render(<MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>);
}

describe("seller marketplace workspace UI", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(marketplaceHooks.useMarketplaceUpdateFarmerProductStatusMutation).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    } as unknown as ReturnType<typeof marketplaceHooks.useMarketplaceUpdateFarmerProductStatusMutation>);
  });

  it("renders a compact seller workspace navigation", () => {
    renderWithRouter(<SellerMarketplaceTabs />);

    const nav = screen.getByRole("navigation", { name: "Không gian bán hàng" });

    expect(nav).toHaveClass("border-b");
    expect(nav).not.toHaveClass("rounded-xl");
    expect(screen.queryByRole("heading", { name: "Workspace bán hàng" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Sản phẩm/ })).toHaveAttribute("aria-current", "page");
  });

  it("makes product search, actions, and mobile cards easy to use", () => {
    vi.mocked(marketplaceHooks.useMarketplaceFarmerProducts).mockReturnValue({
      data: productPage([product]),
      isLoading: false,
      isError: false,
    } as unknown as ReturnType<typeof marketplaceHooks.useMarketplaceFarmerProducts>);

    renderWithRouter(<SellerProductsPage />);

    expect(screen.getByRole("textbox", { name: "Tìm sản phẩm" })).toHaveAttribute(
      "placeholder",
      "Tìm theo tên, mô tả hoặc danh mục...",
    );
    expect(screen.getByLabelText("Trạng thái")).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Danh sách sản phẩm dạng thẻ" })).toBeInTheDocument();
    expect(screen.getAllByText("Đậu nành AGS398 sấy khô 2026").length).toBeGreaterThan(1);
    expect(screen.getAllByRole("button", { name: "Ẩn sản phẩm" })[0]).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "Sửa sản phẩm" })[0]).toHaveAttribute(
      "href",
      "/farmer/marketplace-products/10/edit",
    );
  });

  it("shows a helpful product empty state with a clear next action", () => {
    vi.mocked(marketplaceHooks.useMarketplaceFarmerProducts).mockReturnValue({
      data: productPage([]),
      isLoading: false,
      isError: false,
    } as unknown as ReturnType<typeof marketplaceHooks.useMarketplaceFarmerProducts>);

    renderWithRouter(<SellerProductsPage />);

    expect(screen.getByText("Chưa có sản phẩm phù hợp")).toBeInTheDocument();
    expect(
      screen.getByText("Thử đổi bộ lọc hoặc thêm sản phẩm mới để khách hàng có thể đặt mua."),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: /Thêm sản phẩm/ })[0]).toHaveAttribute(
      "href",
      "/farmer/marketplace-products/new",
    );
  });

  it("renders seller orders as scan-friendly desktop rows and mobile cards", () => {
    vi.mocked(marketplaceHooks.useMarketplaceFarmerOrders).mockReturnValue({
      data: orderPage([order]),
      isLoading: false,
      isError: false,
    } as unknown as ReturnType<typeof marketplaceHooks.useMarketplaceFarmerOrders>);

    renderWithRouter(<SellerOrdersPage />, "/farmer/marketplace-orders");

    expect(screen.getByText("Lọc đơn hàng")).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Danh sách đơn hàng dạng thẻ" })).toBeInTheDocument();
    expect(screen.getAllByText("ORD-2026-001").length).toBeGreaterThan(1);
    expect(screen.getAllByRole("link", { name: /Chi tiết/ })[0]).toHaveAttribute(
      "href",
      "/farmer/marketplace-orders/20",
    );
  });
});
