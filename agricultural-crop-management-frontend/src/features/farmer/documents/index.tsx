import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Clock, FileText, Star } from "lucide-react";
import { Card, CardContent } from "@/shared/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/tabs";
import { useI18n } from "@/shared/lib/hooks/useI18n";
import { PageContainer, PageHeader } from "@/shared/ui";
import { DocumentFilterBar } from "./components/DocumentFilterBar";
import { DocumentGrid } from "./components/DocumentGrid";
import { DocumentPreview } from "./components/DocumentPreview";
import { EmptyState } from "./components/EmptyState";
import { useDocumentFilters } from "./hooks/useDocumentFilters";
import { useDocuments } from "./hooks/useDocuments";

export function Documents() {
  const { t } = useI18n();
  const [searchParams, setSearchParams] = useSearchParams();
  const {
    filters,
    setFilter,
    clearFilters,
    hasActiveFilters,
    activeFilterCount,
    apiParams,
  } = useDocumentFilters();

  const {
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
  } = useDocuments(apiParams);

  const documentIdParam = Number(searchParams.get("documentId"));
  const parsedDocumentId = Number.isFinite(documentIdParam)
    ? documentIdParam
    : null;

  const handlePreviewOpenChange = (open: boolean) => {
    if (!open && searchParams.get("documentId")) {
      const next = new URLSearchParams(searchParams);
      next.delete("documentId");
      setSearchParams(next, { replace: true });
    }
    setIsPreviewOpen(open);
  };

  useEffect(() => {
    if (!parsedDocumentId) return;
    if (selectedDoc?.documentId === parsedDocumentId && isPreviewOpen) return;
    const match = filteredDocuments.find(
      (doc) => doc.documentId === parsedDocumentId,
    );
    if (match) {
      setSelectedDoc(match);
      setIsPreviewOpen(true);
    }
  }, [
    parsedDocumentId,
    selectedDoc?.documentId,
    isPreviewOpen,
    filteredDocuments,
    setSelectedDoc,
    setIsPreviewOpen,
  ]);

  return (
    <PageContainer variant="default">
      <div>
        <div className="mb-6">
          <PageHeader
            icon={<FileText className="w-8 h-8" />}
            title={t("documents.title")}
            subtitle={t("documents.subtitle")}
          />
        </div>

        <div className="mb-6">
          <DocumentFilterBar
            filters={filters}
            onFilterChange={setFilter}
            onClearFilters={clearFilters}
            hasActiveFilters={hasActiveFilters}
          />
        </div>

        <Card variant="content" className="rounded-2xl">
          <CardContent className="px-6 py-4">
            <Tabs
              value={filters.tab}
              onValueChange={(value) =>
                setFilter("tab", value as "all" | "favorites" | "recent")
              }
            >
              <TabsList className="w-full overflow-x-auto mb-6">
                <TabsTrigger
                  value="all"
                  className="rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm data-[state=active]:text-primary"
                >
                  {t("documents.tabs.all")}
                </TabsTrigger>
                <TabsTrigger
                  value="favorites"
                  className="rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm data-[state=active]:text-primary"
                >
                  <Star className="w-4 h-4 mr-2 text-accent" />
                  {t("documents.tabs.favorites")}
                </TabsTrigger>
                <TabsTrigger
                  value="recent"
                  className="rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm data-[state=active]:text-primary"
                >
                  <Clock className="w-4 h-4 mr-2 text-muted-foreground" />
                  {t("documents.tabs.recent")}
                </TabsTrigger>
              </TabsList>

              <TabsContent value={filters.tab} className="mt-0">
                {isLoading ? (
                  <div className="p-6 text-sm text-muted-foreground">
                    {t("documents.states.loading")}
                  </div>
                ) : isEmpty || filteredDocuments.length === 0 ? (
                  <EmptyState
                    searchQuery={filters.q}
                    activeFilterCount={activeFilterCount}
                    onClearAll={clearFilters}
                  />
                ) : (
                  <DocumentGrid
                    documents={filteredDocuments}
                    hoveredDocId={hoveredDocId}
                    onHoverChange={setHoveredDocId}
                    onPreview={handlePreview}
                    onToggleFavorite={handleToggleFavorite}
                    onDownload={handleDownload}
                    onOpen={handleOpenDocument}
                    getDocumentIcon={getDocumentIcon}
                  />
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      <DocumentPreview
        document={selectedDoc}
        isOpen={isPreviewOpen}
        onOpenChange={handlePreviewOpenChange}
        onDownload={handleDownload}
        getDocumentIcon={getDocumentIcon}
        getRelatedDocuments={getRelatedDocuments}
        onSelectRelated={setSelectedDoc}
      />
    </PageContainer>
  );
}
