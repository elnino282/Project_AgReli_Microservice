import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { MarketplaceOrder, MarketplaceOrderStatus } from "@/shared/api";
import { useMarketplaceOrders } from "@/features/marketplace/hooks";
import { MyOrdersPage } from "./MyOrdersPage";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) => {
      if (key === "marketplaceBuyer.myOrders.otherItems") {
        return `+${String(options?.count ?? 0)} more item(s)`;
      }
      if (key === "marketplaceBuyer.myOrders.totalWithCount") {
        return `Total (${String(options?.count ?? 0)} items)`;
      }
      if (key === "marketplaceBuyer.myOrders.status.unknown") {
        return `Unknown status (${String(options?.status ?? "")})`;
      }
      if (key === "marketplaceBuyer.myOrders.paymentVerificationStatus.unknown") {
        return `Unknown verification (${String(options?.status ?? "")})`;
      }

      const dictionary: Record<string, string> = {
        "marketplaceBuyer.myOrders.title": "My orders",
        "marketplaceBuyer.myOrders.subtitle": "Track fulfillment and payment verification for each farmer order.",
        "marketplaceBuyer.myOrders.loadingOrders": "Loading orders...",
        "marketplaceBuyer.myOrders.errorOrders": "Failed to load orders.",
        "marketplaceBuyer.myOrders.filterAll": "All",
        "marketplaceBuyer.myOrders.emptyTitle": "No order yet",
        "marketplaceBuyer.myOrders.emptyDesc": "You have not created a marketplace order.",
        "marketplaceBuyer.myOrders.startShopping": "Start shopping →",
        "marketplaceBuyer.myOrders.group": "Group",
        "marketplaceBuyer.myOrders.eligibleForCancellation": "Eligible for cancellation",
        "marketplaceBuyer.myOrders.cannotCancel": "Cannot be cancelled now",
        "marketplaceBuyer.myOrders.orderDetail": "Order detail",
        "marketplaceBuyer.myOrders.page": "Page",
        "marketplaceBuyer.myOrders.of": "of",
        "marketplaceBuyer.myOrders.previous": "Previous",
        "marketplaceBuyer.myOrders.next": "Next",
        "marketplaceBuyer.myOrders.orderCode": "Order code",
        "marketplaceBuyer.myOrders.orderDate": "Order date",
        "marketplaceBuyer.myOrders.quantity": "Quantity",
        "marketplaceBuyer.myOrders.payment": "Payment",
        "marketplaceBuyer.myOrders.paymentMethod.COD": "Cash on delivery",
        "marketplaceBuyer.myOrders.paymentMethod.BANK_TRANSFER": "Bank transfer",
        "marketplaceBuyer.myOrders.paymentVerificationStatus.NOT_REQUIRED": "Not required",
        "marketplaceBuyer.myOrders.paymentVerificationStatus.AWAITING_PROOF": "Awaiting proof",
        "marketplaceBuyer.myOrders.paymentVerificationStatus.SUBMITTED": "Submitted",
        "marketplaceBuyer.myOrders.paymentVerificationStatus.VERIFIED": "Verified",
        "marketplaceBuyer.myOrders.paymentVerificationStatus.REJECTED": "Rejected",
        "marketplaceBuyer.myOrders.statusGroup.payment": "Payment",
        "marketplaceBuyer.myOrders.statusGroup.review": "Review",
        "marketplaceBuyer.myOrders.statusGroup.processing": "Processing",
        "marketplaceBuyer.myOrders.statusGroup.shipping": "Shipping",
        "marketplaceBuyer.myOrders.statusGroup.completed": "Completed",
        "marketplaceBuyer.myOrders.statusGroup.cancelled": "Closed",
        "marketplaceBuyer.myOrders.statusGroup.unknown": "Unknown",
        "marketplaceBuyer.myOrders.status.PENDING_PAYMENT": "Pending payment",
        "marketplaceBuyer.myOrders.status.PAYMENT_SUBMITTED": "Payment submitted",
        "marketplaceBuyer.myOrders.status.PAYMENT_VERIFIED": "Payment verified",
        "marketplaceBuyer.myOrders.status.CONFIRMED": "Confirmed",
        "marketplaceBuyer.myOrders.status.PREPARING": "Preparing",
        "marketplaceBuyer.myOrders.status.SHIPPED": "Shipped",
        "marketplaceBuyer.myOrders.status.DELIVERED": "Delivered",
        "marketplaceBuyer.myOrders.status.COMPLETED": "Completed",
        "marketplaceBuyer.myOrders.status.REJECTED": "Rejected",
        "marketplaceBuyer.myOrders.status.CANCELLED": "Cancelled",
        "marketplaceBuyer.myOrders.status.PENDING": "Pending payment",
        "marketplaceBuyer.myOrders.status.DELIVERING": "Shipped",
      };

      return dictionary[key] ?? key;
    },
  }),
  initReactI18next: { type: "3rdParty", init: vi.fn() },
}));

vi.mock("@/features/marketplace/hooks", () => ({
  useMarketplaceOrders: vi.fn(),
}));

const mockedUseMarketplaceOrders = vi.mocked(useMarketplaceOrders);
type OrdersHookResult = ReturnType<typeof useMarketplaceOrders>;

function createOrder(id: number, status: MarketplaceOrderStatus, canCancel = false): MarketplaceOrder {
  return {
    id,
    orderCode: `ORD-${id}`,
    orderGroupCode: `GRP-${id}`,
    buyerUserId: 10,
    farmerUserId: 99,
    status,
    payment: {
      method: "BANK_TRANSFER",
      verificationStatus: "SUBMITTED",
      proofFileName: null,
      proofContentType: null,
      proofStoragePath: null,
      proofUploadedAt: null,
      verifiedAt: null,
      verifiedBy: null,
      verificationNote: null,
    },
    shippingRecipientName: "Buyer Demo",
    shippingPhone: "0900000000",
    shippingAddressLine: "123 Test Street",
    note: null,
    subtotal: 100_000,
    shippingFee: 20_000,
    totalAmount: 120_000,
    canCancel,
    createdAt: "2026-05-01T10:00:00Z",
    updatedAt: "2026-05-01T10:00:00Z",
    items: [
      {
        id: id * 10,
        productId: id * 100,
        productName: `Product ${id}`,
        productSlug: `product-${id}`,
        imageUrl: "",
        unitPriceSnapshot: 50_000,
        quantity: 2,
        lineTotal: 100_000,
        traceableSnapshot: true,
        canReview: false,
        reviewId: null,
      },
    ],
  };
}

function renderPage(initialEntry = "/marketplace/orders") {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/marketplace/orders" element={<MyOrdersPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

function createOrdersHookResult(
  orders: MarketplaceOrder[],
  totalPages = 1,
): OrdersHookResult {
  return {
    data: {
      items: orders,
      page: 0,
      size: 10,
      totalElements: orders.length,
      totalPages,
    },
    isLoading: false,
    isError: false,
  } as unknown as OrdersHookResult;
}

describe("MyOrdersPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders order list with translated status labels", async () => {
    mockedUseMarketplaceOrders.mockReturnValue(
      createOrdersHookResult([createOrder(1, "PENDING_PAYMENT", true)]),
    );

    renderPage();

    expect(screen.getByText("Kệ Thức Ăn An Toàn")).toBeInTheDocument();
    expect(
      screen.getByText("Hành trình nông sản minh bạch từ nông trại đến gia đình bạn."),
    ).toBeInTheDocument();
    expect(screen.getByText("#ORD-1")).toBeInTheDocument();
    expect(screen.getByTestId("order-status-1")).toHaveTextContent("Pending payment");
    expect(screen.getByText("Group: Payment").parentElement!).toHaveClass("rounded-lg");
    expect(screen.getByText("Eligible for cancellation").parentElement!).toHaveClass("rounded-lg");
    expect(screen.getByText("Payment: Bank transfer - Submitted").parentElement!).toHaveClass(
      "rounded-lg",
    );
    expect(screen.queryByText("PENDING_PAYMENT")).not.toBeInTheDocument();
  });

  it("applies lifecycle filter status instead of legacy aliases", async () => {
    const calls: Array<Record<string, unknown> | undefined> = [];
    mockedUseMarketplaceOrders.mockImplementation((query) => {
      calls.push(query as Record<string, unknown> | undefined);
      return createOrdersHookResult([createOrder(2, "CONFIRMED")]);
    });
    const user = userEvent.setup();

    renderPage();

    expect(calls.at(-1)).toMatchObject({ status: undefined, page: 0, size: 10 });
    await user.click(screen.getByRole("button", { name: "Confirmed" }));

    await waitFor(() => {
      expect(calls.at(-1)).toMatchObject({
        status: "CONFIRMED",
        page: 0,
        size: 10,
      });
    });
  });

  it("shows empty state when no orders are returned", () => {
    mockedUseMarketplaceOrders.mockReturnValue(createOrdersHookResult([]));

    renderPage();

    expect(screen.getByText("No order yet")).toBeInTheDocument();
    expect(screen.getByText("You have not created a marketplace order.")).toBeInTheDocument();
  });

  it("updates page param through pagination controls", async () => {
    const calls: Array<Record<string, unknown> | undefined> = [];
    mockedUseMarketplaceOrders.mockImplementation((query) => {
      calls.push(query as Record<string, unknown> | undefined);
      return createOrdersHookResult([createOrder(3, "CONFIRMED")], 3);
    });
    const user = userEvent.setup();

    renderPage("/marketplace/orders?page=1");

    expect(calls.at(-1)).toMatchObject({ page: 0, size: 10 });
    await user.click(screen.getByRole("button", { name: "Next" }));

    await waitFor(() => {
      expect(calls.at(-1)).toMatchObject({ page: 1, size: 10 });
    });

    await user.click(screen.getByRole("button", { name: "Previous" }));
    await waitFor(() => {
      expect(calls.at(-1)).toMatchObject({ page: 0, size: 10 });
    });
  });

  it("renders detail link using marketplace canonical route", () => {
    mockedUseMarketplaceOrders.mockReturnValue(
      createOrdersHookResult([createOrder(42, "DELIVERED")]),
    );

    renderPage();

    expect(screen.getByRole("link", { name: /order detail/i })).toHaveAttribute(
      "href",
      "/marketplace/orders/42",
    );
  });

  it("covers lifecycle status labels, tones, and groups without showing raw enums", () => {
    const statuses: MarketplaceOrderStatus[] = [
      "PENDING_PAYMENT",
      "PAYMENT_SUBMITTED",
      "PAYMENT_VERIFIED",
      "CONFIRMED",
      "PREPARING",
      "SHIPPED",
      "DELIVERED",
      "COMPLETED",
      "REJECTED",
      "CANCELLED",
    ];
    mockedUseMarketplaceOrders.mockReturnValue(
      createOrdersHookResult(statuses.map((status, index) => createOrder(index + 1, status))),
    );

    renderPage();

    expect(screen.getAllByText("Pending payment").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Payment submitted").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Payment verified").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Confirmed").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Preparing").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Shipped").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Delivered").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Completed").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Rejected").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Cancelled").length).toBeGreaterThan(0);

    expect(screen.getAllByText(/Group: Payment/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Group: Review/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Group: Processing/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Group: Shipping/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Group: Completed/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Group: Closed/).length).toBeGreaterThan(0);

    expect(screen.getByTestId("order-status-1")).toHaveClass("bg-orange-100");
    expect(screen.getByTestId("order-status-2")).toHaveClass("bg-amber-100");
    expect(screen.getByTestId("order-status-3")).toHaveClass("bg-sky-100");
    expect(screen.getByTestId("order-status-4")).toHaveClass("bg-blue-100");
    expect(screen.getByTestId("order-status-5")).toHaveClass("bg-blue-100");
    expect(screen.getByTestId("order-status-6")).toHaveClass("bg-sky-100");
    expect(screen.getByTestId("order-status-7")).toHaveClass("bg-sky-100");
    expect(screen.getByTestId("order-status-8")).toHaveClass("bg-emerald-100");
    expect(screen.getByTestId("order-status-9")).toHaveClass("bg-red-100");
    expect(screen.getByTestId("order-status-10")).toHaveClass("bg-red-100");

    expect(screen.queryByText("PENDING_PAYMENT")).not.toBeInTheDocument();
    expect(screen.queryByText("PAYMENT_SUBMITTED")).not.toBeInTheDocument();
    expect(screen.queryByText("PAYMENT_VERIFIED")).not.toBeInTheDocument();
    expect(screen.queryByText("SHIPPED")).not.toBeInTheDocument();
  });

  it("keeps legacy aliases compatible for old snapshots", () => {
    mockedUseMarketplaceOrders.mockReturnValue(
      createOrdersHookResult([createOrder(90, "PENDING"), createOrder(91, "DELIVERING")]),
    );

    renderPage();

    expect(screen.getAllByText("Pending payment").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Shipped").length).toBeGreaterThan(0);
    expect(screen.queryByText("PENDING")).not.toBeInTheDocument();
    expect(screen.queryByText("DELIVERING")).not.toBeInTheDocument();
  });
});
