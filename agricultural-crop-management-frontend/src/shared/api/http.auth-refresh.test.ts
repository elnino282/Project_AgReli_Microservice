import { beforeEach, describe, expect, it, vi } from "vitest";
import httpClient, { refreshAccessToken } from "./http";

const user = {
  id: 42,
  username: "farmer.alpha",
  role: "farmer",
  email: "alpha@example.test",
};

function authRecord(token = "old-token") {
  return {
    token,
    refreshToken: token,
    expiresAt: Date.now() + 60_000,
    user,
  };
}

describe("HTTP auth refresh storage contract", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    window.history.replaceState({}, "", "/");
    vi.restoreAllMocks();
  });

  it("refreshes a session-only login in sessionStorage and preserves user", async () => {
    sessionStorage.setItem("acm_auth", JSON.stringify(authRecord()));
    vi.spyOn(httpClient, "post").mockResolvedValue({
      data: { result: { token: "new-session-token", expiresIn: 3600 } },
    });

    await expect(refreshAccessToken()).resolves.toBe("new-session-token");

    expect(localStorage.getItem("acm_auth")).toBeNull();
    expect(JSON.parse(sessionStorage.getItem("acm_auth")!)).toEqual({
      token: "new-session-token",
      refreshToken: "new-session-token",
      expiresAt: expect.any(Number),
      user,
    });
  });

  it("keeps remember-me auth in localStorage and removes a stale session copy", async () => {
    localStorage.setItem("acm_auth", JSON.stringify(authRecord()));
    sessionStorage.setItem("acm_auth", JSON.stringify(authRecord("stale-session")));
    vi.spyOn(httpClient, "post").mockResolvedValue({
      data: { result: { token: "new-local-token", expiresIn: 1200 } },
    });

    await refreshAccessToken();

    expect(JSON.parse(localStorage.getItem("acm_auth")!).user).toEqual(user);
    expect(sessionStorage.getItem("acm_auth")).toBeNull();
  });

  it("ignores and clears a malformed local shadow before refreshing valid session auth", async () => {
    localStorage.setItem("acm_auth", JSON.stringify({ expiresAt: null }));
    sessionStorage.setItem("acm_auth", JSON.stringify(authRecord("session-token")));
    const post = vi.spyOn(httpClient, "post").mockResolvedValue({
      data: { result: { token: "recovered-token", expiresIn: 600 } },
    });

    await refreshAccessToken();

    expect(post).toHaveBeenCalledWith("/api/v1/auth/refresh", { token: "session-token" });
    expect(localStorage.getItem("acm_auth")).toBeNull();
    expect(JSON.parse(sessionStorage.getItem("acm_auth")!).token).toBe("recovered-token");
  });

  it("does not overwrite auth or return a token for a malformed refresh envelope", async () => {
    const original = JSON.stringify(authRecord());
    sessionStorage.setItem("acm_auth", original);
    vi.spyOn(httpClient, "post").mockResolvedValue({ data: { token: "wrong-level" } });

    await expect(refreshAccessToken()).resolves.toBeNull();
    expect(sessionStorage.getItem("acm_auth")).toBe(original);
    expect(localStorage.getItem("acm_auth")).toBeNull();
  });

  it("uses one refresh request for concurrent 401 callers", async () => {
    sessionStorage.setItem("acm_auth", JSON.stringify(authRecord()));
    let resolvePost!: (value: { data: unknown }) => void;
    const post = vi.spyOn(httpClient, "post").mockImplementation(
      () => new Promise((resolve) => { resolvePost = resolve; }) as never,
    );

    const first = refreshAccessToken();
    const second = refreshAccessToken();
    resolvePost({ data: { result: { token: "shared-token", expiresIn: 300 } } });

    await expect(Promise.all([first, second])).resolves.toEqual(["shared-token", "shared-token"]);
    expect(post).toHaveBeenCalledTimes(1);
  });

  it("clears both storage locations when refresh is rejected with 401", async () => {
    localStorage.setItem("acm_auth", JSON.stringify(authRecord()));
    sessionStorage.setItem("acm_auth", JSON.stringify(authRecord("stale")));
    vi.spyOn(httpClient, "post").mockRejectedValue({
      isAxiosError: true,
      response: { status: 401 },
    });

    await expect(refreshAccessToken()).resolves.toBeNull();
    expect(localStorage.getItem("acm_auth")).toBeNull();
    expect(sessionStorage.getItem("acm_auth")).toBeNull();
  });

  it("preserves existing auth when refresh fails with a server error", async () => {
    const original = JSON.stringify(authRecord());
    sessionStorage.setItem("acm_auth", original);
    vi.spyOn(httpClient, "post").mockRejectedValue({
      isAxiosError: true,
      response: { status: 503 },
    });

    await expect(refreshAccessToken()).resolves.toBeNull();
    expect(sessionStorage.getItem("acm_auth")).toBe(original);
  });

  it("does not recursively refresh when the refresh endpoint itself returns 401", async () => {
    sessionStorage.setItem("acm_auth", JSON.stringify(authRecord()));
    window.history.replaceState({}, "", "/sign-in");
    const originalAdapter = httpClient.defaults.adapter;
    const adapter = vi.fn(async (config: unknown) => {
      throw {
        isAxiosError: true,
        config,
        response: { status: 401, data: {}, config, headers: {}, statusText: "Unauthorized" },
      };
    });
    httpClient.defaults.adapter = adapter;

    try {
      await expect(httpClient.get("/protected")).rejects.toMatchObject({
        response: { status: 401 },
      });
      expect(adapter).toHaveBeenCalledTimes(2);
      expect(sessionStorage.getItem("acm_auth")).toBeNull();
    } finally {
      httpClient.defaults.adapter = originalAdapter;
    }
  });
});
