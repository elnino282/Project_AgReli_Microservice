import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MarketplacePublicLayout } from "./MarketplacePublicLayout";

const authMock = vi.hoisted(() => ({
  logout: vi.fn(),
  state: {
    isAuthenticated: false,
    user: null as null | { name: string; email: string; role: string },
  },
}));

vi.mock("@/features/auth", () => ({
  useAuth: () => ({
    isAuthenticated: authMock.state.isAuthenticated,
    user: authMock.state.user,
    logout: authMock.logout,
  }),
}));

vi.mock("@/shared/lib/hooks/useTheme", () => ({
  useTheme: () => ({ theme: "light", setTheme: vi.fn() }),
}));

vi.mock("../ai/BuyerAiAssistantDrawer", () => ({
  BuyerAiAssistantDrawer: () => null,
}));

vi.mock("../hooks", () => ({
  useMarketplaceCartCount: () => 0,
  useMarketplaceCartMergeBridge: vi.fn(),
  useMarketplaceAddToCart: () => ({ addToCart: vi.fn(), isAdding: false }),
  useMarketplaceProducts: () => ({ data: undefined, isLoading: false }),
  useScrolled: () => false,
}));

describe("MarketplacePublicLayout document scrolling", () => {
  beforeEach(() => {
    authMock.logout.mockReset();
    authMock.state.isAuthenticated = false;
    authMock.state.user = null;
  });

  it("enables normal document scrolling while mounted and cleans up on unmount", () => {
    const { unmount } = render(
      <MemoryRouter initialEntries={["/marketplace"]}>
        <MarketplacePublicLayout />
      </MemoryRouter>,
    );

    expect(document.documentElement).toHaveClass("marketplace-document-scroll");
    expect(document.body).toHaveClass("marketplace-document-scroll");

    unmount();

    expect(document.documentElement).not.toHaveClass(
      "marketplace-document-scroll",
    );
    expect(document.body).not.toHaveClass("marketplace-document-scroll");
  });

  it("redirects a buyer to sign in after logout", async () => {
    const user = userEvent.setup();
    authMock.state.isAuthenticated = true;
    authMock.state.user = {
      name: "Tran Thi Buyer",
      email: "buyer@acm.local",
      role: "buyer",
    };
    authMock.logout.mockResolvedValue(undefined);

    render(
      <MemoryRouter initialEntries={["/marketplace"]}>
        <Routes>
          <Route path="/marketplace" element={<MarketplacePublicLayout />}>
            <Route index element={<div>Marketplace home</div>} />
          </Route>
          <Route path="/sign-in" element={<div>Sign in screen</div>} />
        </Routes>
      </MemoryRouter>,
    );

    await user.click(screen.getByRole("button", { name: /menu/i }));
    await user.click(await screen.findByRole("button", { name: /ng xu/i }));

    expect(authMock.logout).toHaveBeenCalledTimes(1);
    expect(await screen.findByText("Sign in screen")).toBeInTheDocument();
  });

  it("renders the farms nav item and marks it active on the farms page", () => {
    render(
      <MemoryRouter initialEntries={["/marketplace/farms"]}>
        <Routes>
          <Route path="/marketplace" element={<MarketplacePublicLayout />}>
            <Route path="farms" element={<div>Farms page</div>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    const farmsLink = screen.getByRole("link", { name: "Nông trại", hidden: true });

    expect(farmsLink).toHaveAttribute("href", "/marketplace/farms");
    expect(farmsLink).toHaveClass("bg-white/15", "font-semibold");
  });

  it("includes the farms link in the mobile menu", async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter initialEntries={["/marketplace"]}>
        <Routes>
          <Route path="/marketplace" element={<MarketplacePublicLayout />}>
            <Route index element={<div>Marketplace home</div>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    await user.click(screen.getByRole("button", { name: /menu/i }));

    expect(screen.getByRole("link", { name: "Nông trại" })).toHaveAttribute(
      "href",
      "/marketplace/farms",
    );
  });
});
