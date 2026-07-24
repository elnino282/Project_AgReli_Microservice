import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { AdminMarketplaceOrdersPage } from "../AdminMarketplaceOrdersPage";
import * as marketplaceHooks from "@/features/marketplace/hooks/useMarketplaceQueries";

vi.mock("@/features/marketplace/hooks/useMarketplaceQueries");

describe("AdminMarketplaceOrdersPage", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    vi.clearAllMocks();

    // Common mocks that are the same across most tests
    vi.mocked(marketplaceHooks.useMarketplaceAdminOrderDetail).mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: false,
    } as any);

    vi.mocked(marketplaceHooks.useMarketplaceAdminOrderAuditLogs).mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
    } as any);

    vi.mocked(marketplaceHooks.useMarketplaceUpdateAdminOrderStatusMutation).mockReturnValue({
      mutate: vi.fn(),
      mutateAsync: vi.fn(),
      isPending: false,
    } as any);
  });

  const renderPage = () => {
    return render(
      <MemoryRouter>
        <QueryClientProvider client={queryClient}>
          <AdminMarketplaceOrdersPage />
        </QueryClientProvider>
      </MemoryRouter>
    );
  };

  const createMockOrder = (overrides = {}) => ({
    id: 1,
    orderCode: "ORD-001",
    status: "PENDING",
    totalAmount: 100000,
    buyerUserId: 1,
    farmerUserId: 2,
    payment: {
      method: "BANK_TRANSFER",
      verificationStatus: "SUBMITTED",
    },
    createdAt: "2026-05-01T10:00:00Z",
    ...overrides,
  });

  it("renders order list", async () => {
    vi.mocked(marketplaceHooks.useMarketplaceAdminOrders).mockReturnValue({
      data: {
        items: [createMockOrder()],
        totalPages: 1,
        totalElements: 1,
        page: 0,
        size: 25,
      },
      isLoading: false,
      isError: false,
    } as any);

    vi.mocked(marketplaceHooks.useMarketplaceUpdateAdminOrderPaymentVerificationMutation).mockReturnValue({
      mutate: vi.fn(),
      mutateAsync: vi.fn(),
      isPending: false,
    } as any);

    renderPage();

    await waitFor(() => {
      expect(screen.getByText("ORD-001")).toBeInTheDocument();
    });
  });

  it("verify payment calls mutation without modal", async () => {
    const user = userEvent.setup();
    const mutateAsync = vi.fn().mockResolvedValue({});
    const refetch = vi.fn().mockResolvedValue({});

    vi.mocked(marketplaceHooks.useMarketplaceAdminOrders).mockReturnValue({
      data: {
        items: [createMockOrder()],
        totalPages: 1,
        totalElements: 1,
        page: 0,
        size: 25,
      },
      isLoading: false,
      isError: false,
    } as any);

    vi.mocked(marketplaceHooks.useMarketplaceAdminOrderDetail).mockReturnValue({
      data: {
        id: 1,
        orderCode: "ORD-001",
        status: "PENDING",
        totalAmount: 100000,
        shippingRecipientName: "John Doe",
        shippingPhone: "0123456789",
        shippingAddressLine: "123 Main St",
        payment: {
          method: "BANK_TRANSFER",
          verificationStatus: "SUBMITTED",
        },
        items: [],
      },
      isLoading: false,
      isError: false,
      refetch,
    } as any);

    vi.mocked(marketplaceHooks.useMarketplaceAdminOrderAuditLogs).mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
      refetch,
    } as any);

    vi.mocked(marketplaceHooks.useMarketplaceUpdateAdminOrderPaymentVerificationMutation).mockReturnValue({
      mutate: vi.fn(),
      mutateAsync,
      isPending: false,
    } as any);

    renderPage();

    const orderButton = await screen.findByRole("button", { name: /ORD-001/i });
    await user.click(orderButton);

    await waitFor(() => {
      expect(screen.getByText("admin.marketplace.orders.detail.title")).toBeInTheDocument();
    });

    const verifyButton = screen.getByRole("button", { name: "admin.marketplace.orders.actions.markVerified" });
    await user.click(verifyButton);

    expect(mutateAsync).toHaveBeenCalledWith({
      verificationStatus: "VERIFIED",
      verificationNote: "",
    });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("reject payment opens modal and requires reason", async () => {
    const user = userEvent.setup();
    const mutateAsync = vi.fn().mockResolvedValue({});
    const refetch = vi.fn().mockResolvedValue({});

    vi.mocked(marketplaceHooks.useMarketplaceAdminOrders).mockReturnValue({
      data: {
        items: [createMockOrder()],
        totalPages: 1,
        totalElements: 1,
        page: 0,
        size: 25,
      },
      isLoading: false,
      isError: false,
    } as any);

    vi.mocked(marketplaceHooks.useMarketplaceAdminOrderDetail).mockReturnValue({
      data: {
        id: 1,
        orderCode: "ORD-001",
        status: "PENDING",
        totalAmount: 100000,
        shippingRecipientName: "John Doe",
        shippingPhone: "0123456789",
        shippingAddressLine: "123 Main St",
        payment: {
          method: "BANK_TRANSFER",
          verificationStatus: "SUBMITTED",
        },
        items: [],
      },
      isLoading: false,
      isError: false,
      refetch,
    } as any);

    vi.mocked(marketplaceHooks.useMarketplaceAdminOrderAuditLogs).mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
      refetch,
    } as any);

    vi.mocked(marketplaceHooks.useMarketplaceUpdateAdminOrderPaymentVerificationMutation).mockReturnValue({
      mutate: vi.fn(),
      mutateAsync,
      isPending: false,
    } as any);

    renderPage();

    const orderButton = await screen.findByRole("button", { name: /ORD-001/i });
    await user.click(orderButton);

    await waitFor(() => {
      expect(screen.getByText("admin.marketplace.orders.detail.title")).toBeInTheDocument();
    });

    const rejectButton = screen.getByRole("button", { name: "admin.marketplace.orders.actions.rejectProof" });
    await user.click(rejectButton);

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("admin.marketplace.orders.rejectPayment.title")).toBeInTheDocument();

    const confirmButton = screen.getByRole("button", { name: "common.confirm" });
    expect(confirmButton).toBeDisabled();

    const textarea = screen.getByLabelText("admin.marketplace.orders.rejectPayment.reasonLabel");
    await user.type(textarea, "Payment proof is unclear");

    expect(confirmButton).toBeEnabled();
    await user.click(confirmButton);

    await waitFor(() => {
      expect(mutateAsync).toHaveBeenCalledWith({
        verificationStatus: "REJECTED",
        verificationNote: "Payment proof is unclear",
      });
    });
  });

  it("shows loading state when orders are being fetched", () => {
    vi.mocked(marketplaceHooks.useMarketplaceAdminOrders).mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
    } as any);

    vi.mocked(marketplaceHooks.useMarketplaceUpdateAdminOrderPaymentVerificationMutation).mockReturnValue({
      mutate: vi.fn(),
      mutateAsync: vi.fn(),
      isPending: false,
    } as any);

    renderPage();

    expect(screen.getByText("admin.marketplace.orders.list.loading")).toBeInTheDocument();
  });

  it("shows error message when orders fail to load", () => {
    vi.mocked(marketplaceHooks.useMarketplaceAdminOrders).mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
    } as any);

    vi.mocked(marketplaceHooks.useMarketplaceUpdateAdminOrderPaymentVerificationMutation).mockReturnValue({
      mutate: vi.fn(),
      mutateAsync: vi.fn(),
      isPending: false,
    } as any);

    renderPage();

    expect(screen.getByText("admin.marketplace.orders.list.loadError")).toBeInTheDocument();
  });
});
