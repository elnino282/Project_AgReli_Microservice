import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { documentKeys } from "../model/keys";
import type {
  DocumentListParams,
  DocumentPageResponse,
} from "../model/types";
import { documentApi } from "./client";

/**
 * Hook to list documents with pagination, filters, and tab support
 */
export function useDocumentsList(params?: DocumentListParams) {
  return useQuery({
    queryKey: documentKeys.list(params),
    queryFn: () => documentApi.list(params),
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
}

/**
 * Hook to get document filter metadata
 */
export function useDocumentsMeta() {
  return useQuery({
    queryKey: documentKeys.meta(),
    queryFn: () => documentApi.getMeta(),
    staleTime: 1000 * 60 * 10, // 10 minutes - meta data changes infrequently
  });
}

/**
 * Hook to get single document by ID
 */
export function useDocument(id: number, enabled = true) {
  return useQuery({
    queryKey: documentKeys.detail(id),
    queryFn: () => documentApi.getById(id),
    enabled,
  });
}

/**
 * Hook to record document open (for Recent tab)
 */
export function useRecordDocumentOpen() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => documentApi.recordOpen(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: documentKeys.lists() });
    },
  });
}

/**
 * Hook to add document to favorites
 */
export function useAddFavorite() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => documentApi.addFavorite(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: documentKeys.lists() });
      const previous = queryClient.getQueriesData<DocumentPageResponse>({
        queryKey: documentKeys.lists(),
      });

      previous.forEach(([queryKey, data]) => {
        if (!data) return;
        queryClient.setQueryData<DocumentPageResponse>(queryKey, {
          ...data,
          items: data.items.map((document) =>
            document.documentId === id
              ? { ...document, isFavorited: true }
              : document,
          ),
        });
      });

      return { previous };
    },
    onError: (_error, _id, context) => {
      context?.previous.forEach(([queryKey, data]) => {
        queryClient.setQueryData(queryKey, data);
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: documentKeys.lists() });
    },
  });
}

/**
 * Hook to remove document from favorites
 */
export function useRemoveFavorite() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => documentApi.removeFavorite(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: documentKeys.lists() });
      const previous = queryClient.getQueriesData<DocumentPageResponse>({
        queryKey: documentKeys.lists(),
      });

      previous.forEach(([queryKey, data]) => {
        if (!data) return;
        const params = queryKey[2] as DocumentListParams | undefined;
        const isFavoritesTab = params?.tab === "favorites";
        const items = isFavoritesTab
          ? data.items.filter((document) => document.documentId !== id)
          : data.items.map((document) =>
              document.documentId === id
                ? { ...document, isFavorited: false }
                : document,
            );
        const removedCount = data.items.length - items.length;
        const totalElements = Math.max(0, data.totalElements - removedCount);

        queryClient.setQueryData<DocumentPageResponse>(queryKey, {
          ...data,
          items,
          totalElements,
          totalPages: Math.ceil(totalElements / Math.max(data.size, 1)),
        });
      });

      return { previous };
    },
    onError: (_error, _id, context) => {
      context?.previous.forEach(([queryKey, data]) => {
        queryClient.setQueryData(queryKey, data);
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: documentKeys.lists() });
    },
  });
}
