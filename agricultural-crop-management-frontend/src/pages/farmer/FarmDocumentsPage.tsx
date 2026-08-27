import React, { useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  FileText,
  Plus,
  Search,
  Trash2,
  Calendar,
  File,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  ExternalLink,
  UploadCloud,
  X,
  Eye,
  Filter
} from "lucide-react";
import httpClient from "@/shared/api/http";
import { farmApi } from "@/features/farmer/farms/api";
import { useI18n } from "@/shared/lib/hooks/useI18n";
import {
  Badge,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  PageContainer,
  PageHeader,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Textarea
} from "@/shared/ui";

// Type definitions matching the backend DTOs
export interface FarmDocumentResponse {
  id: number;
  farmId: number;
  documentType: string;
  documentTypeLabel: string;
  title: string;
  description: string;
  fileUrl: string;
  issuedDate: string | null;
  expiryDate: string | null;
  expired: boolean;
  expiringSoon: boolean;
  verificationStatus: "PENDING" | "VERIFIED" | "REJECTED" | "EXPIRED";
  verifiedByName: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface FarmDocumentCreateRequest {
  title: string;
  documentType: string;
  description: string;
  fileUrl: string;
  issuedDate: string | null;
  expiryDate: string | null;
}

const DOCUMENT_TYPES = [
  { value: "LAND_CERTIFICATE", label: "Giấy phép đất / Land Certificate" },
  { value: "SOIL_TEST_REPORT", label: "Báo cáo phân tích đất / Soil Test Report" },
  { value: "WATER_TEST_REPORT", label: "Báo cáo phân tích nước / Water Test Report" },
  { value: "PESTICIDE_RECORD", label: "Hồ sơ thuốc BVTV / Pesticide Record" },
  { value: "FERTILIZER_RECORD", label: "Hồ sơ phân bón / Fertilizer Record" },
  { value: "HARVEST_LOG", label: "Hồ sơ thu hoạch / Harvest Log" },
  { value: "INTERNAL_AUDIT", label: "Biên bản kiểm tra nội bộ / Internal Audit" },
  { value: "PERIODIC_INSPECTION", label: "Biên bản kiểm tra định kỳ / Periodic Inspection" },
  { value: "CERTIFICATE", label: "Giấy chứng nhận (VietGAP,...) / Certificate" },
  { value: "OTHER", label: "Khác / Other" }
];

export default function FarmDocumentsPage() {
  const { t, locale } = useI18n();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const handledUploadDeepLink = useRef(false);

  // State management
  const [selectedFarmId, setSelectedFarmId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>("ALL");
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  
  // File Upload State
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);

  // Form State
  const [title, setTitle] = useState("");
  const [documentType, setDocumentType] = useState("LAND_CERTIFICATE");
  const [description, setDescription] = useState("");
  const [issuedDate, setIssuedDate] = useState("");
  const [expiryDate, setExpiryDate] = useState("");

  // Get active farms
  const { data: farms = [], isLoading: isLoadingFarms } = useQuery({
    queryKey: ["my-farms"],
    queryFn: farmApi.getMyFarms,
    meta: {
      onSuccess: (data: any[]) => {
        if (data.length > 0 && !selectedFarmId) {
          setSelectedFarmId(data[0].id);
        }
      }
    }
  });

  // Auto-select first farm when farms list loads
  useEffect(() => {
    if (farms.length > 0 && selectedFarmId === null) {
      const requestedFarmId = Number(searchParams.get("farmId"));
      const requestedFarm = farms.find((farm: { id: number }) => farm.id === requestedFarmId);
      setSelectedFarmId(requestedFarm?.id ?? farms[0].id);
    }
  }, [farms, searchParams, selectedFarmId]);

  useEffect(() => {
    if (!selectedFarmId || handledUploadDeepLink.current || searchParams.get("openUpload") !== "1") return;

    const requestedType = searchParams.get("type");
    const supportedType = DOCUMENT_TYPES.some((type) => type.value === requestedType);
    if (requestedType && supportedType) {
      setDocumentType(requestedType);
      const selectedLabel = DOCUMENT_TYPES.find((type) => type.value === requestedType)?.label.split(" /")[0];
      setTitle(selectedLabel ? `${selectedLabel} - ${new Date().getFullYear()}` : "");
    }
    handledUploadDeepLink.current = true;
    setIsUploadModalOpen(true);
  }, [searchParams, selectedFarmId]);

  // Fetch documents for selected farm
  const { data: documents = [], isLoading: isLoadingDocs, refetch: refetchDocs } = useQuery({
    queryKey: ["farm-documents", selectedFarmId],
    queryFn: async () => {
      if (!selectedFarmId) return [];
      const res = await httpClient.get<{ result: FarmDocumentResponse[] }>(
        `/api/v1/farms/${selectedFarmId}/documents`
      );
      return res.data.result || [];
    },
    enabled: !!selectedFarmId
  });

  // Fetch expiring documents for selected farm
  const { data: expiringDocs = [], refetch: refetchExpiring } = useQuery({
    queryKey: ["farm-documents-expiring", selectedFarmId],
    queryFn: async () => {
      if (!selectedFarmId) return [];
      const res = await httpClient.get<{ result: FarmDocumentResponse[] }>(
        `/api/v1/farms/${selectedFarmId}/documents/expiring`
      );
      return res.data.result || [];
    },
    enabled: !!selectedFarmId
  });

  // Notification logic on load or farm change
  useEffect(() => {
    if (expiringDocs.length > 0) {
      const expiringCount = expiringDocs.filter(d => d.expiringSoon).length;
      const expiredCount = expiringDocs.filter(d => d.expired).length;
      
      if (expiredCount > 0 && expiringCount > 0) {
        toast.warning(
          `Cảnh báo: Có ${expiredCount} tài liệu đã hết hạn và ${expiringCount} tài liệu sắp hết hạn. Vui lòng kiểm tra và cập nhật!`,
          { duration: 6000 }
        );
      } else if (expiredCount > 0) {
        toast.error(
          `Cảnh báo: Có ${expiredCount} tài liệu đã hết hạn cần được cập nhật ngay lập tức!`,
          { duration: 6000 }
        );
      } else if (expiringCount > 0) {
        toast.warning(
          `Lưu ý: Có ${expiringCount} tài liệu sắp hết hạn trong vòng 30 ngày tới.`,
          { duration: 6000 }
        );
      }
    }
  }, [expiringDocs]);

  // File upload mutation
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File size cannot exceed 10MB");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);
    setUploadingFile(true);
    setUploadedFileName(file.name);

    try {
      const res = await httpClient.post<{ result: string }>(
        `/api/v1/farms/${selectedFarmId}/documents/upload`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data"
          }
        }
      );
      setUploadedUrl(res.data.result);
      toast.success("File uploaded successfully to MinIO");
    } catch (error: any) {
      console.error(error);
      toast.error(error.response?.data?.message || "Failed to upload file");
      setUploadedFileName(null);
    } finally {
      setUploadingFile(false);
    }
  };

  // Create document record mutation
  const createDocumentMutation = useMutation({
    mutationFn: async (req: FarmDocumentCreateRequest) => {
      const res = await httpClient.post(
        `/api/v1/farms/${selectedFarmId}/documents`,
        req
      );
      return res.data;
    },
    onSuccess: () => {
      toast.success("Tài liệu đã được thêm thành công!");
      queryClient.invalidateQueries({ queryKey: ["farm-documents", selectedFarmId] });
      queryClient.invalidateQueries({ queryKey: ["farm-documents-expiring", selectedFarmId] });
      resetForm();
      setIsUploadModalOpen(false);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Lỗi khi lưu tài liệu");
    }
  });

  // Delete document mutation
  const deleteDocumentMutation = useMutation({
    mutationFn: async (id: number) => {
      await httpClient.delete(`/api/v1/farms/${selectedFarmId}/documents/${id}`);
    },
    onSuccess: () => {
      toast.success("Tài liệu đã được xóa thành công!");
      queryClient.invalidateQueries({ queryKey: ["farm-documents", selectedFarmId] });
      queryClient.invalidateQueries({ queryKey: ["farm-documents-expiring", selectedFarmId] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Lỗi khi xóa tài liệu");
    }
  });

  const resetForm = () => {
    setTitle("");
    setDocumentType("LAND_CERTIFICATE");
    setDescription("");
    setIssuedDate("");
    setExpiryDate("");
    setUploadedUrl(null);
    setUploadedFileName(null);
  };

  const handleCreateDocument = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("Vui lòng nhập tiêu đề");
      return;
    }
    if (!uploadedUrl) {
      toast.error("Vui lòng tải lên tài liệu");
      return;
    }

    createDocumentMutation.mutate({
      title,
      documentType,
      description,
      fileUrl: uploadedUrl,
      issuedDate: issuedDate ? issuedDate : null,
      expiryDate: expiryDate ? expiryDate : null
    });
  };

  const handleDelete = (id: number) => {
    if (window.confirm("Bạn có chắc chắn muốn xóa tài liệu này?")) {
      deleteDocumentMutation.mutate(id);
    }
  };

  // Filter documents
  const filteredDocuments = documents.filter((doc) => {
    const matchesSearch = doc.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (doc.description && doc.description.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesType = selectedTypeFilter === "ALL" || doc.documentType === selectedTypeFilter;
    return matchesSearch && matchesType;
  });

  // Helper to format date cleanly
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "N/A";
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString(locale === "vi-VN" ? "vi-VN" : "en-US", {
        year: "numeric",
        month: "long",
        day: "numeric"
      });
    } catch {
      return dateStr;
    }
  };

  // Status badging styles
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "VERIFIED":
        return <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border-none font-medium">Đã xác minh</Badge>;
      case "REJECTED":
        return <Badge className="bg-rose-100 text-rose-800 hover:bg-rose-200 border-none font-medium">Từ chối</Badge>;
      case "EXPIRED":
        return <Badge className="bg-slate-100 text-slate-700 hover:bg-slate-200 border-none font-medium">Hết hạn</Badge>;
      default:
        return <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-200 border-none font-medium">Chờ xác minh</Badge>;
    }
  };

  // Expiry badging styles
  const getExpiryBadge = (doc: FarmDocumentResponse) => {
    if (doc.expired) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-rose-700 bg-rose-50 rounded-full border border-rose-200 animate-pulse">
          <AlertTriangle className="w-3.5 h-3.5" />
          Đã Hết Hạn
        </span>
      );
    }
    if (doc.expiringSoon) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-amber-700 bg-amber-50 rounded-full border border-amber-200">
          <AlertTriangle className="w-3.5 h-3.5" />
          Sắp Hết Hạn
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 rounded-full border border-emerald-200">
        <CheckCircle className="w-3.5 h-3.5" />
        Hợp Lệ
      </span>
    );
  };

  return (
    <PageContainer>
      {/* Upper Navigation/Control Card */}
      <div className="mb-6">
        <div className="p-0">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <PageHeader
                className="mb-0 p-0"
                icon={<FileText className="w-9 h-9 text-emerald-700" />}
                title={locale === "vi-VN" ? "Quản lý Tài liệu VietGAP" : "VietGAP Farm Documents"}
                subtitle={
                  locale === "vi-VN"
                    ? "Lưu trữ và theo dõi hồ sơ pháp lý, báo cáo phân tích phục vụ chứng nhận VietGAP"
                    : "Manage and audit certifications, soil/water reports, and harvest logs for VietGAP"
                }
              />
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
              {/* Farm Selector */}
              <div className="flex items-center gap-2 bg-white rounded-xl px-3 py-1.5 shadow-sm border border-slate-100">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wide px-1">Farm:</span>
                <Select
                  value={selectedFarmId?.toString() || ""}
                  onValueChange={(val) => setSelectedFarmId(Number(val))}
                >
                  <SelectTrigger className="w-[180px] border-none shadow-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ring-offset-background bg-transparent text-sm font-semibold text-slate-800">
                    <SelectValue placeholder="Chọn nông trại" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border border-slate-100 shadow-md">
                    {farms.map((f) => (
                      <SelectItem key={f.id} value={f.id.toString()} className="font-medium text-slate-700">
                        {f.farmName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Upload Document Button */}
              <Button
                onClick={() => {
                  if (!selectedFarmId) {
                    toast.error("Vui lòng chọn nông trại trước!");
                    return;
                  }
                  setIsUploadModalOpen(true);
                }}
                className="min-h-[44px] bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl px-5 py-6 font-semibold shadow-sm transition-all duration-300 hover:scale-[1.02] hover:shadow-md active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 ring-offset-background flex items-center gap-2"
              >
                <Plus className="w-5 h-5" />
                Thêm Tài Liệu
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Warning/Alert Board for Expiring/Expired Documents */}
      {expiringDocs.length > 0 && (
        <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          {expiringDocs.filter(d => d.expired).map(doc => (
            <div key={doc.id} className="flex items-start gap-3 p-4 bg-rose-50 border border-rose-100 rounded-xl shadow-sm animate-pulse">
              <div className="p-2 bg-rose-100 rounded-lg text-rose-700">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-bold text-rose-950 truncate">{doc.title}</h4>
                <p className="text-xs text-rose-800 font-medium mt-0.5">
                  Đã hết hạn vào ngày: {formatDate(doc.expiryDate)}
                </p>
                <a
                  href={doc.fileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-bold text-rose-700 hover:text-rose-900 mt-2 transition-colors"
                >
                  Xem tài liệu cũ <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          ))}
          {expiringDocs.filter(d => d.expiringSoon).map(doc => (
            <div key={doc.id} className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-100 rounded-xl shadow-sm">
              <div className="p-2 bg-amber-100 rounded-lg text-amber-700">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-bold text-amber-950 truncate">{doc.title}</h4>
                <p className="text-xs text-amber-800 font-medium mt-0.5">
                  Sắp hết hạn vào ngày: {formatDate(doc.expiryDate)} (Còn lại ít hơn 30 ngày)
                </p>
                <a
                  href={doc.fileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-bold text-amber-700 hover:text-amber-900 mt-2 transition-colors"
                >
                  Xem tài liệu <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Main Panel */}
      <Card className="border border-slate-100 shadow-sm rounded-2xl overflow-hidden bg-white">
        <CardContent className="p-0">
          {/* Filters & Search Toolbar */}
          <div className="p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/50">
            {/* Filter Tabs */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
              <Button
                variant={selectedTypeFilter === "ALL" ? "default" : "outline"}
                onClick={() => setSelectedTypeFilter("ALL")}
                className={`min-h-[44px] rounded-xl px-4 py-2 text-xs font-bold transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 ring-offset-background ${
                  selectedTypeFilter === "ALL"
                    ? "bg-emerald-800 text-white shadow-sm"
                    : "bg-white text-slate-600 hover:bg-slate-50 border-slate-200"
                }`}
              >
                Tất cả
              </Button>
              {DOCUMENT_TYPES.map((type) => (
                <Button
                  key={type.value}
                  variant={selectedTypeFilter === type.value ? "default" : "outline"}
                  onClick={() => setSelectedTypeFilter(type.value)}
                  className={`min-h-[44px] rounded-xl px-4 py-2 text-xs font-bold whitespace-nowrap transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 ring-offset-background ${
                    selectedTypeFilter === type.value
                      ? "bg-emerald-800 text-white shadow-sm"
                      : "bg-white text-slate-600 hover:bg-slate-50 border-slate-200"
                  }`}
                >
                  {type.label.split(" / ")[0]}
                </Button>
              ))}
            </div>

            {/* Search Input */}
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <Input
                type="text"
                placeholder="Tìm kiếm tài liệu..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 w-full border-slate-200 focus:border-emerald-500 rounded-xl text-sm font-medium shadow-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 ring-offset-background"
              />
            </div>
          </div>

          {/* List of documents */}
          {isLoadingDocs ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-500 gap-3">
              <RefreshCw className="w-8 h-8 animate-spin text-emerald-700" />
              <span className="text-sm font-semibold">Đang tải danh sách tài liệu...</span>
            </div>
          ) : filteredDocuments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-4">
              <div className="p-4 bg-slate-50 rounded-full text-slate-300">
                <FileText className="w-12 h-12" />
              </div>
              <div className="text-center space-y-1">
                <p className="font-bold text-slate-700 text-lg">Chưa có tài liệu nào</p>
                <p className="text-xs text-slate-500 max-w-sm">
                  Hãy thêm tài liệu VietGAP đầu tiên để hoàn thiện hồ sơ chứng nhận của nông trại.
                </p>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50/70 border-b border-slate-100">
                  <TableRow>
                    <TableHead className="font-bold text-slate-700 py-4 px-6 text-sm">Tài liệu</TableHead>
                    <TableHead className="font-bold text-slate-700 py-4 px-6 text-sm">Loại tài liệu</TableHead>
                    <TableHead className="font-bold text-slate-700 py-4 px-6 text-sm">Ngày cấp</TableHead>
                    <TableHead className="font-bold text-slate-700 py-4 px-6 text-sm">Ngày hết hạn</TableHead>
                    <TableHead className="font-bold text-slate-700 py-4 px-6 text-sm">VietGAP Expiry</TableHead>
                    <TableHead className="font-bold text-slate-700 py-4 px-6 text-sm">Xác minh</TableHead>
                    <TableHead className="font-bold text-slate-700 py-4 px-6 text-sm text-right">Thao tác</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDocuments.map((doc) => (
                    <TableRow key={doc.id} className="hover:bg-slate-50/50 transition-colors border-b border-slate-100/80">
                      <TableCell className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className="p-2.5 bg-emerald-50 text-emerald-700 rounded-xl">
                            <File className="w-5 h-5" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-slate-800 text-sm truncate max-w-xs md:max-w-md">{doc.title}</p>
                            {doc.description && (
                              <p className="text-xs text-slate-500 truncate max-w-xs md:max-w-md mt-0.5">{doc.description}</p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="py-4 px-6">
                        <Badge className="bg-slate-100 text-slate-800 border-none font-semibold hover:bg-slate-200">
                          {doc.documentTypeLabel}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-4 px-6 text-sm font-medium text-slate-600">
                        {formatDate(doc.issuedDate)}
                      </TableCell>
                      <TableCell className="py-4 px-6 text-sm font-medium text-slate-600">
                        {formatDate(doc.expiryDate)}
                      </TableCell>
                      <TableCell className="py-4 px-6">
                        {getExpiryBadge(doc)}
                      </TableCell>
                      <TableCell className="py-4 px-6">
                        {getStatusBadge(doc.verificationStatus)}
                      </TableCell>
                      <TableCell className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="min-h-[44px] min-w-[44px] rounded-lg h-9 w-9 p-0 border-slate-200 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                            onClick={() => window.open(doc.fileUrl, "_blank")}
                            title="Xem chi tiết"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="min-h-[44px] min-w-[44px] rounded-lg h-9 w-9 p-0 border-slate-200 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
                            onClick={() => handleDelete(doc.id)}
                            title="Xóa tài liệu"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Document Modal */}
      <Dialog open={isUploadModalOpen} onOpenChange={setIsUploadModalOpen}>
        <DialogContent className="sm:max-w-[550px] rounded-2xl overflow-hidden p-0 border-none shadow-2xl">
          <DialogHeader className="p-6 pb-4 bg-gradient-to-r from-emerald-50 to-teal-50 border-b border-slate-100">
            <DialogTitle className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <FileText className="w-6 h-6 text-emerald-700" />
              Thêm Tài Liệu Mới
            </DialogTitle>
            <DialogDescription className="text-slate-600 font-medium text-xs mt-1">
              Điền thông tin và tải tài liệu của nông trại lên hệ thống (phục vụ đánh giá VietGAP).
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateDocument} className="p-6 space-y-5">
            <div className="space-y-2">
              <Label htmlFor="title" className="font-bold text-slate-700 text-sm">Tiêu đề tài liệu <span className="text-rose-500">*</span></Label>
              <Input
                id="title"
                type="text"
                placeholder="Nhập tên tài liệu (Ví dụ: Giấy phân tích mẫu nước Q3-2026)"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="border-slate-200 focus:border-emerald-500 rounded-xl focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 ring-offset-background"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="documentType" className="font-bold text-slate-700 text-sm">Phân loại VietGAP <span className="text-rose-500">*</span></Label>
                <Select value={documentType} onValueChange={setDocumentType}>
                  <SelectTrigger id="documentType" className="border-slate-200 focus:border-emerald-500 rounded-xl focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 ring-offset-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border border-slate-100">
                    {DOCUMENT_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value} className="font-semibold text-slate-700">
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="file-upload" className="font-bold text-slate-700 text-sm">File tài liệu <span className="text-rose-500">*</span></Label>
                <div className="relative">
                  <input
                    id="file-upload"
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg,.webp"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <Label
                    htmlFor="file-upload"
                    className="flex items-center justify-center gap-2 border border-dashed border-slate-300 hover:border-emerald-500 hover:bg-emerald-50/20 rounded-xl py-2 px-3 cursor-pointer text-xs font-bold text-slate-700 transition-all duration-300 focus-within:ring-2 focus-within:ring-emerald-500 focus-within:ring-offset-2 ring-offset-background"
                  >
                    {uploadingFile ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin text-emerald-700" />
                        Đang tải lên...
                      </>
                    ) : uploadedFileName ? (
                      <>
                        <File className="w-4 h-4 text-emerald-700" />
                        <span className="truncate max-w-[150px]">{uploadedFileName}</span>
                      </>
                    ) : (
                      <>
                        <UploadCloud className="w-4 h-4 text-slate-500" />
                        Chọn file (PDF, ảnh)
                      </>
                    )}
                  </Label>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="issuedDate" className="font-bold text-slate-700 text-sm">Ngày cấp</Label>
                <div className="relative">
                  <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <Input
                    id="issuedDate"
                    type="date"
                    value={issuedDate}
                    onChange={(e) => setIssuedDate(e.target.value)}
                    className="border-slate-200 focus:border-emerald-500 rounded-xl pl-10 focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 ring-offset-background"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="expiryDate" className="font-bold text-slate-700 text-sm">Ngày hết hạn</Label>
                <div className="relative">
                  <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <Input
                    id="expiryDate"
                    type="date"
                    value={expiryDate}
                    onChange={(e) => setExpiryDate(e.target.value)}
                    className="border-slate-200 focus:border-emerald-500 rounded-xl pl-10 focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 ring-offset-background"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description" className="font-bold text-slate-700 text-sm">Mô tả ngắn</Label>
              <Textarea
                id="description"
                placeholder="Ghi chú thêm về tài liệu (ví dụ: Số hiệu tài liệu, nhà cung cấp, hoặc ghi chú kiểm định)..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="border-slate-200 focus:border-emerald-500 rounded-xl min-h-[80px] focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 ring-offset-background"
              />
            </div>

            <DialogFooter className="pt-2 border-t border-slate-100 flex items-center justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  resetForm();
                  setIsUploadModalOpen(false);
                }}
                className="min-h-[44px] rounded-xl border-slate-200 font-semibold"
              >
                Hủy bỏ
              </Button>
              <Button
                type="submit"
                disabled={createDocumentMutation.isPending || uploadingFile || !uploadedUrl}
                className="min-h-[44px] bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-semibold shadow-sm transition-all duration-200 hover:scale-[1.02] hover:shadow-md active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 ring-offset-background px-5"
              >
                {createDocumentMutation.isPending ? "Đang lưu..." : "Lưu tài liệu"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}
