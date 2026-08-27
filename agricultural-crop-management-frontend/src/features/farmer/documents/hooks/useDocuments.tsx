import {
  useAddFavorite,
  useDocumentsList,
  useRecordDocumentOpen,
  useRemoveFavorite,
  type Document as ApiDocument,
  type DocumentListParams,
} from "@/entities/document";
import {
  BookOpen,
  FileSpreadsheet,
  FileText,
  Image as ImageIcon,
  Video,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useI18n } from "@/shared/lib/hooks/useI18n";
import type { Document, DocumentType } from "../types";

type Translate = (
  key: string,
  optionsOrDefault?: Record<string, unknown> | string,
) => string;

const mapApiToDocument = (doc: ApiDocument, t: Translate): Document => ({
  id: String(doc.documentId),
  documentId: doc.documentId,
  title: doc.title,
  url: doc.url,
  type: mapDocumentType(doc.documentType),
  thumbnail: t("documents.thumbnail"),
  tags: [doc.crop, doc.stage, doc.topic].filter(Boolean) as string[],
  crop: doc.crop ?? undefined,
  stage: doc.stage ?? undefined,
  topic: doc.topic ?? "",
  season: undefined,
  updatedAt: doc.createdAt ?? new Date().toISOString(),
  isFavorite: doc.isFavorited ?? false,
  description: doc.description ?? "",
  fileSize: t("common.notAvailable", "-"),
  author: t("documents.fallback.systemAuthor"),
  relatedDocs: [],
});

const mapDocumentType = (type: string | null | undefined): DocumentType => {
  switch (type?.toUpperCase()) {
    case "GUIDE":
      return "guide";
    case "TEMPLATE":
      return "pdf";
    case "ANNOUNCEMENT":
      return "pdf";
    case "SYSTEM_HELP":
      return "guide";
    default:
      return "guide";
  }
};

interface UseDocumentsParams {
  tab?: "all" | "favorites" | "recent";
  q?: string;
  type?: string;
  crop?: string;
  stage?: string;
  topic?: string;
  sort?: string;
}

export function useDocuments(params?: UseDocumentsParams) {
  const { t } = useI18n();
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [hoveredDocId, setHoveredDocId] = useState<string | null>(null);

  const apiParams: DocumentListParams = useMemo(
    () => ({
      tab: params?.tab || "all",
      q: params?.q,
      type: params?.type,
      crop: params?.crop,
      stage: params?.stage,
      topic: params?.topic,
      sort: params?.sort as DocumentListParams["sort"],
      page: 0,
      size: 50,
    }),
    [
      params?.tab,
      params?.q,
      params?.type,
      params?.crop,
      params?.stage,
      params?.topic,
      params?.sort,
    ],
  );

  const { data: apiResponse, isLoading, error } = useDocumentsList(apiParams);
  const addFavoriteMutation = useAddFavorite();
  const removeFavoriteMutation = useRemoveFavorite();
  const recordOpenMutation = useRecordDocumentOpen();

  const documents = useMemo(() => {
    if (!apiResponse?.items) return [];
    return apiResponse.items.map((doc) => mapApiToDocument(doc, t));
  }, [apiResponse, t]);

  const filteredDocuments = documents;

  const handleToggleFavorite = useCallback(
    (docId: string) => {
      const doc = documents.find((d) => d.id === docId);
      if (!doc) return;

      const numericId = doc.documentId;

      if (doc.isFavorite) {
        removeFavoriteMutation.mutate(numericId, {
          onSuccess: () => {
            toast.success(t("documents.toast.removedFavorite"));
          },
          onError: () => {
            toast.error(t("documents.toast.removeFavoriteFailed"));
          },
        });
      } else {
        addFavoriteMutation.mutate(numericId, {
          onSuccess: () => {
            toast.success(t("documents.toast.addedFavorite"));
          },
          onError: () => {
            toast.error(t("documents.toast.addFavoriteFailed"));
          },
        });
      }
    },
    [documents, addFavoriteMutation, removeFavoriteMutation, t],
  );

  const handleOpenDocument = useCallback(
    (doc: Document) => {
      window.open(doc.url, "_blank", "noopener,noreferrer");
      recordOpenMutation.mutate(doc.documentId);
    },
    [recordOpenMutation],
  );

  const handleDownload = useCallback(
    (doc: Document) => {
      handleOpenDocument(doc);
    },
    [handleOpenDocument],
  );

  const handlePreview = useCallback(
    (doc: Document) => {
      setSelectedDoc(doc);
      setIsPreviewOpen(true);
      recordOpenMutation.mutate(doc.documentId);
    },
    [recordOpenMutation],
  );

  const getDocumentIcon = useCallback((type: DocumentType) => {
    switch (type) {
      case "pdf":
        return <FileText className="w-5 h-5 text-destructive" />;
      case "image":
        return <ImageIcon className="w-5 h-5 text-secondary" />;
      case "video":
        return <Video className="w-5 h-5 text-primary" />;
      case "spreadsheet":
        return <FileSpreadsheet className="w-5 h-5 text-primary" />;
      case "guide":
        return <BookOpen className="w-5 h-5 text-accent" />;
    }
  }, []);

  const getRelatedDocuments = useCallback(
    (doc: Document) => {
      if (!doc.relatedDocs) return [];
      return documents.filter((d) => doc.relatedDocs?.includes(d.id));
    },
    [documents],
  );

  useEffect(() => {
    if (error) {
      toast.error(t("documents.toast.loadFailed"), {
        description:
          error instanceof Error
            ? error.message
            : t("documents.toast.unknownError"),
      });
    }
  }, [error, t]);

  const isEmpty = useMemo(
    () => documents.length === 0 && !isLoading,
    [documents.length, isLoading],
  );

  return {
    selectedDoc,
    isPreviewOpen,
    hoveredDocId,
    filteredDocuments,
    isLoading,
    isEmpty,
    setIsPreviewOpen,
    setHoveredDocId,
    setSelectedDoc,
    handleToggleFavorite,
    handleDownload,
    handlePreview,
    handleOpenDocument,
    getDocumentIcon,
    getRelatedDocuments,
  };
}
