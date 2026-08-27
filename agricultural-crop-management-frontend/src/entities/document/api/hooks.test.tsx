import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { documentKeys } from "../model/keys";
import type { DocumentPageResponse } from "../model/types";
import { documentApi } from "./client";
import {
  useAddFavorite,
  useRecordDocumentOpen,
  useRemoveFavorite,
} from "./hooks";

const documentPage: DocumentPageResponse = {
  items: [
    {
      documentId: 7,
      title: "Quy trình canh tác lúa",
      url: "https://example.test/rice-guide",
      documentType: "GUIDE",
      isFavorited: true,
    },
  ],
  page: 0,
  size: 50,
  totalElements: 1,
  totalPages: 1,
};

function createHarness() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return { queryClient, wrapper };
}

describe("document interaction hooks", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("removes an unstarred document from the cached favorites tab immediately", async () => {
    vi.spyOn(documentApi, "removeFavorite").mockResolvedValue();
    const { queryClient, wrapper } = createHarness();
    const allKey = documentKeys.list({ tab: "all", page: 0, size: 50 });
    const favoritesKey = documentKeys.list({
      tab: "favorites",
      page: 0,
      size: 50,
    });
    queryClient.setQueryData(allKey, documentPage);
    queryClient.setQueryData(favoritesKey, documentPage);
    const { result } = renderHook(() => useRemoveFavorite(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync(7);
    });

    expect(queryClient.getQueryData<DocumentPageResponse>(favoritesKey)).toMatchObject({
      items: [],
      totalElements: 0,
      totalPages: 0,
    });
    expect(
      queryClient.getQueryData<DocumentPageResponse>(allKey)?.items[0]
        ?.isFavorited,
    ).toBe(false);
  });

  it("marks the document as favorite in existing list caches", async () => {
    vi.spyOn(documentApi, "addFavorite").mockResolvedValue();
    const { queryClient, wrapper } = createHarness();
    const allKey = documentKeys.list({ tab: "all", page: 0, size: 50 });
    queryClient.setQueryData(allKey, {
      ...documentPage,
      items: [{ ...documentPage.items[0], isFavorited: false }],
    });
    const { result } = renderHook(() => useAddFavorite(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync(7);
    });

    expect(
      queryClient.getQueryData<DocumentPageResponse>(allKey)?.items[0]
        ?.isFavorited,
    ).toBe(true);
  });

  it("invalidates document lists after recording an access", async () => {
    vi.spyOn(documentApi, "recordOpen").mockResolvedValue();
    const { queryClient, wrapper } = createHarness();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
    const { result } = renderHook(() => useRecordDocumentOpen(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync(7);
    });

    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: documentKeys.lists(),
    });
  });
});
