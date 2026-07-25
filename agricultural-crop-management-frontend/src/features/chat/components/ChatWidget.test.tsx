import { useMemo, useState } from "react";
import { readFileSync } from "node:fs";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { FloatingChatButton } from "./FloatingChatButton";
import { ChatWidget } from "./ChatWidget";
import type { UseChatWidgetResult } from "../hooks/useChatWidget";
import type { ChatConversation, ChatMessage } from "../model/types";

const widgetHookMocks = vi.hoisted(() => ({
  useChatWidget: vi.fn(),
}));

const marketplaceHookMocks = vi.hoisted(() => ({
  useMarketplaceFarmDetail: vi.fn(),
}));

vi.mock("../hooks/useChatWidget", () => ({
  useChatWidget: widgetHookMocks.useChatWidget,
}));

vi.mock("@/features/marketplace/hooks", () => ({
  useMarketplaceFarmDetail: marketplaceHookMocks.useMarketplaceFarmDetail,
}));

vi.mock("@/features/auth/context/AuthContext", () => ({
  useAuth: () => ({ isAuthenticated: true }),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (_key: string, options?: { defaultValue?: string; count?: number }) => {
      if (!options?.defaultValue) return _key;
      return options.defaultValue.replace("{{count}}", String(options.count ?? ""));
    },
  }),
}));

function LocationProbe() {
  const location = useLocation();
  return <span data-testid="location-path">{location.pathname}</span>;
}

function createConversation(overrides: Partial<ChatConversation> = {}): ChatConversation {
  return {
    id: "u_24__u_31",
    type: "direct",
    participantIds: ["u_24", "u_31"],
    peerUid: "u_31",
    peerUserId: 31,
    peerProfile: {
      userId: 31,
      firebaseUid: "u_31",
      displayName: "Nong trai An Phu",
      representativeName: "Nguyen An",
      farmName: "Nong trai An Phu",
      address: "Da Lat",
      role: "FARMER",
      avatarUrl: null,
    },
    lastMessageText: "Don hang da san sang.",
    lastMessageAt: new Date("2026-05-25T08:00:00.000Z"),
    lastMessageSenderUid: "u_31",
    lastSeq: 5,
    lastReadSeq: 3,
    unreadCount: 2,
    ...overrides,
  };
}

function createMessage(overrides: Partial<ChatMessage> = {}): ChatMessage {
  return {
    id: "msg-1",
    seq: 5,
    senderUid: "u_31",
    text: "Don hang da san sang.",
    createdAt: new Date("2026-05-25T08:00:00.000Z"),
    status: "sent",
    ...overrides,
  };
}

function useMockChatWidget(): UseChatWidgetResult {
  const conversations = useMemo(
    () => [
      createConversation(),
      createConversation({
        id: "u_24__u_40",
        peerUid: "u_40",
        peerUserId: 40,
        peerProfile: {
          userId: 40,
          firebaseUid: "u_40",
          displayName: "GreenFarm Organic",
          representativeName: "Tran Binh",
          farmName: "GreenFarm Organic",
          address: "Can Tho",
          role: "FARMER",
          avatarUrl: null,
        },
        lastMessageText: "Cam on ban da dat mua.",
        lastMessageAt: new Date("2026-05-24T10:00:00.000Z"),
        lastSeq: 1,
        lastReadSeq: 0,
        unreadCount: 1,
      }),
    ],
    [],
  );
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([createMessage()]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState<UseChatWidgetResult["filter"]>("all");
  const selectedConversation =
    conversations.find((conversation) => conversation.id === selectedConversationId) ?? null;
  const filteredConversations = conversations.filter((conversation) => {
    if (filter === "unread" && conversation.unreadCount <= 0) {
      return false;
    }
    if (!searchQuery.trim()) {
      return true;
    }
    return (conversation.peerProfile?.displayName ?? "")
      .toLowerCase()
      .includes(searchQuery.trim().toLowerCase());
  });

  return {
    conversations,
    filteredConversations,
    selectedConversation,
    selectedConversationId,
    messages: selectedConversationId ? messages : [],
    searchQuery,
    filter,
    totalUnreadCount: 3,
    isLoading: false,
    isMessagesLoading: false,
    isSending: false,
    isStartingConversation: false,
    error: null,
    messagesError: null,
    currentUid: "u_24",
    setSearchQuery,
    setFilter,
    selectConversation: async (conversationId) => setSelectedConversationId(conversationId),
    startConversation: async (peerUserId) => setSelectedConversationId(`u_24__u_${peerUserId}`),
    clearSelectedConversation: () => setSelectedConversationId(null),
    sendMessage: async (content) =>
      setMessages((current) => [
        ...current,
        createMessage({
          id: `local-${current.length}`,
          seq: current.length + 6,
          senderUid: "u_24",
          text: content,
          createdAt: new Date("2026-05-25T09:00:00.000Z"),
        }),
      ]),
  };
}

function renderFloatingButton() {
  return render(
    <MemoryRouter
      initialEntries={["/marketplace"]}
      future={{ v7_relativeSplatPath: true, v7_startTransition: true }}
    >
      <FloatingChatButton />
      <Routes>
        <Route path="*" element={<LocationProbe />} />
      </Routes>
    </MemoryRouter>,
  );
}

const originalError = console.error;

beforeEach(() => {
  console.error = (...args) => {
    if (typeof args[0] === "string" && args[0].includes("was not wrapped in act")) {
      return;
    }
    originalError.call(console, ...args);
  };
  
  HTMLElement.prototype.scrollIntoView = vi.fn();
  widgetHookMocks.useChatWidget.mockImplementation(useMockChatWidget);
  marketplaceHookMocks.useMarketplaceFarmDetail.mockReturnValue({
    data: {
      id: 31,
      name: "Nong trai An Phu",
      ratingAverage: 4.6,
      ratingCount: 12,
    },
    isLoading: false,
    isError: false,
  });
});

afterEach(() => {
  console.error = originalError;
});

describe("Floating chat widget", () => {
  it("uses friendly Vietnamese copy in the widget controls", async () => {
    render(
      <MemoryRouter future={{ v7_relativeSplatPath: true, v7_startTransition: true }}>
        <ChatWidget isOpen onMinimize={vi.fn()} onClose={vi.fn()} onExpand={vi.fn()} />
      </MemoryRouter>,
    );

    expect(await screen.findByPlaceholderText("Tìm hội thoại...")).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Tất cả" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Chưa đọc" })).toBeInTheDocument();
  });

  it("anchors the popup close to the bottom-right viewport edge on desktop", () => {
    const css = readFileSync("src/features/chat/components/ChatWidget.css", "utf8");

    expect(css).toContain("right: max(8px, env(safe-area-inset-right));");
    expect(css).toContain("bottom: max(8px, env(safe-area-inset-bottom));");
  });

  it("keeps the desktop widget balanced with a stable sidebar and composer", () => {
    const css = readFileSync("src/features/chat/components/ChatWidget.css", "utf8");

    expect(css).toContain("width: clamp(780px, 52vw, 920px);");
    expect(css).toContain("height: min(680px, calc(100vh - 24px));");
    expect(css).toContain("grid-template-columns: 320px minmax(0, 1fr);");
    expect(css).toContain("padding: 16px 18px 14px;");
    expect(css).toContain("min-height: 92px;");
  });

  it("shows unread badge on the floating button and opens the popup", async () => {
    const user = userEvent.setup();
    renderFloatingButton();

    expect(screen.getByRole("button", { name: /open chat/i })).toBeInTheDocument();
    expect(await screen.findByText("3")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /open chat/i }));

    expect(await screen.findByRole("dialog", { name: /chat/i })).toBeInTheDocument();
    expect(screen.getByText("Nong trai An Phu")).toBeInTheDocument();
  });

  it("minimizes and closes back to the floating button", async () => {
    const user = userEvent.setup();
    renderFloatingButton();

    await user.click(screen.getByRole("button", { name: /open chat/i }));
    await user.click(await screen.findByRole("button", { name: /minimize chat/i }));

    expect(screen.queryByRole("dialog", { name: /chat/i })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /open chat/i })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /open chat/i }));
    await user.click(await screen.findByRole("button", { name: /close chat/i }));

    expect(screen.queryByRole("dialog", { name: /chat/i })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /open chat/i })).toBeInTheDocument();
  });

  it("expands by navigating to the existing chat route", async () => {
    const user = userEvent.setup();
    renderFloatingButton();

    await user.click(screen.getByRole("button", { name: /open chat/i }));
    await user.click(await screen.findByRole("button", { name: /expand chat/i }));

    await waitFor(() => {
      expect(screen.getByTestId("location-path")).toHaveTextContent("/chat");
    });
  });

  it("selects a conversation, sends a trimmed message, and keeps the popup open", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter future={{ v7_relativeSplatPath: true, v7_startTransition: true }}>
        <ChatWidget isOpen onMinimize={vi.fn()} onClose={vi.fn()} onExpand={vi.fn()} />
      </MemoryRouter>,
    );

    await user.click(
      await screen.findByRole("button", { name: /open conversation with Nong trai An Phu/i }),
    );
    expect((await screen.findAllByText("Nguyen An - Da Lat")).length).toBeGreaterThan(0);
    expect(screen.getAllByText("Don hang da san sang.").length).toBeGreaterThan(0);

    const input = screen.getByRole("textbox", { name: /message input/i });
    expect(input).toHaveAttribute("placeholder", "Nhập nội dung tin nhắn");
    await user.type(input, "  Giao giup minh sau 15h  ");
    await user.click(screen.getByRole("button", { name: /send message/i }));

    await waitFor(() => {
      expect(screen.getAllByText("Giao giup minh sau 15h").length).toBeGreaterThan(0);
    });
    expect(screen.getByText("Bạn")).toBeInTheDocument();
    expect(screen.getByRole("dialog", { name: /chat/i })).toBeInTheDocument();
  });

  it("renders the refined farm chat layout with API rating and a single farm action", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter future={{ v7_relativeSplatPath: true, v7_startTransition: true }}>
        <ChatWidget isOpen onMinimize={vi.fn()} onClose={vi.fn()} onExpand={vi.fn()} />
      </MemoryRouter>,
    );

    await user.click(
      await screen.findByRole("button", { name: /open conversation with Nong trai An Phu/i }),
    );

    expect(screen.getAllByRole("searchbox")).toHaveLength(1);
    expect(screen.getByRole("link", { name: /Xem nông trại/i })).toHaveAttribute(
      "href",
      "/marketplace/farms/31",
    );
    expect(screen.queryByRole("link", { name: /Xem sản phẩm/i })).not.toBeInTheDocument();
    expect(screen.queryByText("Đang hoạt động")).not.toBeInTheDocument();
    expect(screen.queryByText("Không hoạt động")).not.toBeInTheDocument();
    expect(screen.getByText("4.6")).toBeInTheDocument();
    expect(screen.getByText("(12 đánh giá)")).toBeInTheDocument();
    expect(screen.queryByText("4.8")).not.toBeInTheDocument();
    expect(screen.getByLabelText("2 unread")).toBeInTheDocument();

    const css = readFileSync("src/features/chat/components/ChatWidget.css", "utf8");
    expect(css).toContain("min-height: 86px;");
    expect(css).toContain("grid-template-columns: minmax(0, 1fr) 84px;");
    expect(css).toContain("border-radius: 999px;");
    expect(css).toContain("min-height: 92px;");
  });

  it("supports list-detail-back flow for small screens", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter future={{ v7_relativeSplatPath: true, v7_startTransition: true }}>
        <ChatWidget isOpen onMinimize={vi.fn()} onClose={vi.fn()} onExpand={vi.fn()} />
      </MemoryRouter>,
    );

    await user.click(
      await screen.findByRole("button", { name: /open conversation with GreenFarm Organic/i }),
    );
    expect((await screen.findAllByText("Tran Binh - Can Tho")).length).toBeGreaterThan(0);

    await user.click(screen.getByRole("button", { name: /back to conversations/i }));

    expect(
      screen.getByRole("button", { name: /open conversation with Nong trai An Phu/i }),
    ).toBeInTheDocument();
  });

  it("shows Firebase setup errors without offering contact search", () => {
    widgetHookMocks.useChatWidget.mockReturnValue({
      conversations: [],
      filteredConversations: [],
      selectedConversation: null,
      selectedConversationId: null,
      messages: [],
      searchQuery: "",
      filter: "all",
      totalUnreadCount: 0,
      isLoading: false,
      isMessagesLoading: false,
      isSending: false,
      isStartingConversation: false,
      error: "Firebase chat is disabled by environment flag.",
      messagesError: null,
      currentUid: null,
      setSearchQuery: vi.fn(),
      setFilter: vi.fn(),
      selectConversation: vi.fn(),
      startConversation: vi.fn(),
      clearSelectedConversation: vi.fn(),
      sendMessage: vi.fn(),
    });

    render(
      <MemoryRouter future={{ v7_relativeSplatPath: true, v7_startTransition: true }}>
        <ChatWidget isOpen onMinimize={vi.fn()} onClose={vi.fn()} onExpand={vi.fn()} />
      </MemoryRouter>,
    );

    expect(screen.getByText("Firebase chat is disabled by environment flag.")).toBeInTheDocument();
    expect(screen.queryByRole("textbox", { name: /search chat contacts/i })).not.toBeInTheDocument();
  });

  it("closes the chat widget when the location pathname changes", async () => {
    const user = userEvent.setup();

    function NavigationTrigger() {
      const realNavigate = useNavigate();
      return (
        <button
          type="button"
          onClick={() => {
            realNavigate("/another-page");
          }}
        >
          Navigate
        </button>
      );
    }

    render(
      <MemoryRouter
        initialEntries={["/marketplace"]}
        future={{ v7_relativeSplatPath: true, v7_startTransition: true }}
      >
        <FloatingChatButton />
        <NavigationTrigger />
        <Routes>
          <Route path="/marketplace" element={<div>Marketplace</div>} />
          <Route path="/another-page" element={<div>Another Page</div>} />
        </Routes>
      </MemoryRouter>,
    );

    // Open the chat widget
    expect(screen.getByRole("button", { name: /open chat/i })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /open chat/i }));
    expect(await screen.findByRole("dialog", { name: /chat/i })).toBeInTheDocument();

    // Trigger navigation
    await user.click(screen.getByText("Navigate"));

    // Verify chat widget closes and floating button becomes visible again
    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: /chat/i })).not.toBeInTheDocument();
      expect(screen.getByRole("button", { name: /open chat/i })).toBeInTheDocument();
    });
  });
});
