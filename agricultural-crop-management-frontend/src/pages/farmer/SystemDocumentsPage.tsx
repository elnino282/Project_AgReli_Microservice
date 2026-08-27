import { BookOpen, FileText } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { DocumentLibrary } from "@/features/farmer/documents";
import { UserGuideContent } from "@/features/shared/user-guide";
import { useI18n } from "@/shared/lib/hooks/useI18n";
import {
  Card,
  CardContent,
  PageContainer,
  PageHeader,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/shared/ui";

type SystemDocumentsSection = "library" | "guide";

function resolveSection(value: string | null): SystemDocumentsSection {
  return value === "guide" ? "guide" : "library";
}

export default function SystemDocumentsPage() {
  const { t } = useI18n();
  const [searchParams, setSearchParams] = useSearchParams();
  const section = resolveSection(searchParams.get("section"));

  const handleSectionChange = (value: string) => {
    const nextSection = resolveSection(value);
    const next = new URLSearchParams(searchParams);

    if (nextSection === "guide") {
      next.set("section", "guide");
      next.delete("documentId");
    } else {
      next.delete("section");
    }

    setSearchParams(next, { replace: true });
  };

  return (
    <PageContainer variant="default">
      <div className="space-y-6">
        <PageHeader
          icon={<FileText className="h-8 w-8" />}
          title={t("documents.system.title", "System documents")}
          subtitle={t(
            "documents.system.subtitle",
            "Browse agricultural resources and learn how to use the platform in one place.",
          )}
        />

        <Tabs value={section} onValueChange={handleSectionChange} className="gap-6">
          <TabsList
            className="h-auto w-full gap-1 rounded-xl border border-border/70 bg-card p-1.5 shadow-sm sm:w-fit"
            aria-label={t("documents.system.tabs.ariaLabel", "System document sections")}
          >
            <TabsTrigger
              value="library"
              className="min-h-10 flex-1 rounded-lg border-b-0 px-4 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm sm:flex-none"
            >
              <FileText aria-hidden="true" />
              {t("documents.system.tabs.library", "Document library")}
            </TabsTrigger>
            <TabsTrigger
              value="guide"
              className="min-h-10 flex-1 rounded-lg border-b-0 px-4 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm sm:flex-none"
            >
              <BookOpen aria-hidden="true" />
              {t("documents.system.tabs.guide", "User guide")}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="library" className="mt-0">
            <DocumentLibrary />
          </TabsContent>

          <TabsContent value="guide" className="mt-0">
            <Card variant="content" className="overflow-hidden border-border/70 shadow-sm">
              <CardContent className="p-5 sm:p-6">
                <UserGuideContent portalType="FARMER" embedded />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </PageContainer>
  );
}
