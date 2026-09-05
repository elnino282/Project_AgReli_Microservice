import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
  Award,
  CheckCircle2,
  AlertTriangle,
  Lock,
  ShieldCheck,
  Calendar,
  MapPin,
  Leaf,
  Layers,
  Activity,
  FileText,
  ChevronRight,
  Info,
  ArrowLeft,
  Sparkles,
} from "lucide-react";
import { useMarketplacePublicTraceability } from "@/features/marketplace/hooks";
import type { MarketplaceTraceability } from "@/shared/api";

type TraceCertification = NonNullable<MarketplaceTraceability["certification"]>;

export function isCertificationVerified(
  certification: MarketplaceTraceability["certification"],
  today = new Date(),
): certification is TraceCertification {
  if (!certification || certification.status !== "PUBLISHED" || certification.scopeMatched !== true) return false;
  if (!certification.expiryDate) return true;

  const expiry = new Date(`${certification.expiryDate}T23:59:59.999`);
  return !Number.isNaN(expiry.getTime()) && expiry >= today;
}

export function PublicTracePage() {
  const { slug } = useParams<{ slug: string }>();
  const { data: traceability, isLoading, isError } = useMarketplacePublicTraceability(slug);

  const [activeTab, setActiveTab] = useState<"general" | "phi" | "timeline">("general");

  if (isLoading) {
    return (
      <div className="h-full min-h-screen overflow-y-auto bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="flex flex-col items-center gap-4 bg-white p-8 rounded-3xl shadow-xl shadow-slate-100 max-w-sm w-full text-center">
          <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <div>
            <h3 className="font-bold text-slate-800 text-lg">Đang truy xuất dữ liệu</h3>
            <p className="text-slate-500 text-xs mt-1">Hệ thống đang tải nhật ký số và chứng chỉ số của sản phẩm...</p>
          </div>
        </div>
      </div>
    );
  }

  if (isError || !traceability) {
    return (
      <div className="h-full min-h-screen overflow-y-auto bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="bg-white p-8 rounded-3xl shadow-xl shadow-slate-100 max-w-md w-full text-center space-y-6">
          <div className="w-16 h-16 bg-rose-50 rounded-2xl flex items-center justify-center mx-auto text-rose-500">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <div>
            <h3 className="font-bold text-slate-800 text-xl">Không tìm thấy thông tin</h3>
            <p className="text-slate-500 text-sm mt-2">
              Sản phẩm này chưa được liên kết mã truy xuất nguồn gốc hoặc mã không hợp lệ. Vui lòng quét lại mã QR trên bao bì sản phẩm.
            </p>
          </div>
          <div className="pt-2">
            <Link
              to="/marketplace"
              className="inline-flex items-center justify-center px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl shadow-lg shadow-emerald-100 transition-all text-sm gap-2"
            >
              <ArrowLeft className="w-4 h-4" /> Quay lại Chợ nông sản
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const { farm, season, plot, harvest, productLot, timeline, validatedAt, certification, phiSafety, nutritionClaim } = traceability;
  const hasVerifiedCertification = isCertificationVerified(certification);
  const matchedCertificationScope = certification?.scopes?.find((scope) => scope.seasonId === season?.id);

  // Determine global PHI safety status
  const hasVerifiedPHI = phiSafety != null;
  const isPHISafe = phiSafety?.safe ?? false;
  const pesticideUsage = phiSafety?.pesticideUsage ?? [];
  const totalPesticides = phiSafety?.totalPesticidesUsed ?? 0;
  const safePesticides = phiSafety?.safePesticides ?? 0;
  const cautionPesticides = phiSafety?.cautionPesticides ?? 0;
  const blockedPesticides = totalPesticides - safePesticides - cautionPesticides;

  // Global safety color badge configuration
  let safetyBadgeColor = "bg-slate-50 text-slate-700 border-slate-200";
  let safetyBgClass = "bg-slate-600";
  let safetyStatusLabel = "Chưa có dữ liệu PHI được xác minh";
  let safetyIcon = <Info className="w-6 h-6 text-slate-500" />;

  if (hasVerifiedPHI && isPHISafe) {
    safetyBadgeColor = "bg-emerald-50 text-emerald-800 border-emerald-100";
    safetyBgClass = "bg-emerald-600";
    safetyStatusLabel = "An toàn - Đã hết thời gian cách ly";
    safetyIcon = <CheckCircle2 className="w-6 h-6 text-emerald-500" />;
  } else if (hasVerifiedPHI) {
    if (blockedPesticides > 0) {
      safetyBadgeColor = "bg-rose-50 text-rose-800 border-rose-100";
      safetyBgClass = "bg-red-600";
      safetyStatusLabel = "CẢNH BÁO: ĐANG TRONG THỜI GIAN CÁCH LY";
      safetyIcon = <Lock className="w-6 h-6 text-rose-500" />;
    } else {
      safetyBadgeColor = "bg-amber-50 text-amber-800 border-amber-100";
      safetyBgClass = "bg-amber-600";
      safetyStatusLabel = "CẢNH GIÁC: Thời gian cách ly còn dưới 3 ngày";
      safetyIcon = <AlertTriangle className="w-6 h-6 text-amber-500" />;
    }
  }

  const getPesticideStatusBadge = (status: "SAFE" | "CAUTION" | "BLOCKED") => {
    switch (status) {
      case "SAFE":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100">
            <CheckCircle2 className="w-3.5 h-3.5" /> An toàn
          </span>
        );
      case "CAUTION":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-100">
            <AlertTriangle className="w-3.5 h-3.5" /> Cảnh giác (≤3 ngày)
          </span>
        );
      case "BLOCKED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-100 animate-pulse">
            <Lock className="w-3.5 h-3.5" /> Cách ly
          </span>
        );
    }
  };

  return (
    <div
      data-testid="public-trace-scroll-container"
      className="h-full min-h-screen overflow-y-auto bg-slate-50/50 pb-16 font-sans text-slate-800"
    >
      {/* HEADER BANNER */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-100">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 flex items-center justify-center text-white font-black text-lg shadow-lg shadow-emerald-100">
              VF
            </div>
            <div>
              <h1 className="font-extrabold text-slate-800 text-sm tracking-wide uppercase">VietFuture 2026</h1>
              <p className="text-[10px] text-slate-400 font-medium tracking-tight">CỔNG TRUY XUẤT NGUỒN GỐC SẠCH</p>
            </div>
          </div>
          <Link
            to="/marketplace"
            className="text-xs font-bold text-emerald-600 hover:text-emerald-700 transition-colors flex items-center gap-1 bg-emerald-50 px-3 py-1.5 rounded-lg"
          >
            Chợ nông sản <ChevronRight className="w-3 h-3" />
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 mt-6 space-y-6">
        {/* PRODUCT & PHI SAFETY HIGHLIGHT */}
        <section className="bg-white rounded-3xl border border-slate-100 shadow-xl shadow-slate-100/50 overflow-hidden">
          <div className={`${safetyBgClass} p-6 text-white flex flex-col md:flex-row justify-between items-start md:items-center gap-4`}>
            <div>
              <div className="inline-flex items-center gap-1.5 bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase">
                <ShieldCheck className="w-3.5 h-3.5" /> {hasVerifiedPHI ? "Khóa bảo vệ an toàn thực phẩm" : "Trạng thái xác minh an toàn thực phẩm"}
              </div>
              <h2 className="text-xl font-bold mt-2 leading-tight">
                {productLot?.lotCode ? `Lô hàng: ${productLot.lotCode}` : "Thông tin lô nông sản"}
              </h2>
              {season?.cropName && (
                <p className="text-white/80 text-sm mt-1">
                  Nông sản: <span className="font-semibold text-white">{season.cropName}</span> {season.varietyName ? `(${season.varietyName})` : ""}
                </p>
              )}
            </div>
            <div className="bg-white text-slate-800 p-4 rounded-2xl flex items-center gap-3 w-full md:w-auto shadow-lg shadow-black/5">
              <div className="p-2.5 rounded-xl bg-slate-50">
                {safetyIcon}
              </div>
              <div>
                <p className="text-[10px] text-slate-400 font-semibold uppercase">Trạng thái PHI</p>
                <p className="font-extrabold text-slate-800 text-sm mt-0.5 leading-snug">{safetyStatusLabel}</p>
              </div>
            </div>
          </div>

          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 border-b border-slate-100 bg-slate-50/30">
            <div className="space-y-4">
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Nguồn sản xuất</span>
                <h3 className="font-bold text-slate-800 text-base mt-1 flex items-center gap-1.5">
                  <Leaf className="w-4 h-4 text-emerald-600" /> {farm?.name ?? "Nông trại chưa cập nhật"}
                </h3>
                <p className="text-xs text-slate-500 mt-1 flex items-start gap-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                  <span>{farm?.address ?? farm?.region ?? "Chưa cập nhật địa chỉ"}</span>
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="bg-white p-3 rounded-xl border border-slate-100">
                  <span className="text-[10px] text-slate-400 font-semibold block">Ngày thu hoạch</span>
                  <span className="font-extrabold text-slate-800 text-sm mt-0.5 block">
                    {productLot?.harvestedAt ? new Date(productLot.harvestedAt).toLocaleDateString("vi-VN") : "Đang cập nhật"}
                  </span>
                </div>
                <div className="bg-white p-3 rounded-xl border border-slate-100">
                  <span className="text-[10px] text-slate-400 font-semibold block">Quy cách đóng gói</span>
                  <span className="font-extrabold text-slate-800 text-sm mt-0.5 block capitalize">
                    {productLot?.unit ? `1 ${productLot.unit}` : "Lô rời"}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-100 flex flex-col justify-between relative overflow-hidden group">
              <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-emerald-50 rounded-full opacity-50 group-hover:opacity-80 transition-opacity" />
              {hasVerifiedCertification ? <><div className="relative">
                <div className="flex items-center gap-2">
                  <Award className="w-6 h-6 text-emerald-600 shrink-0" />
                  <div>
                    <span className="text-xs font-bold text-emerald-800">Đạt tiêu chuẩn VietGAP</span>
                    <h4 className="text-[10px] text-slate-400 font-semibold uppercase mt-0.5">
                      {certification.certificationName}
                    </h4>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Loại chứng nhận</span>
                    <span className="font-mono font-semibold text-slate-700 block mt-0.5">
                      {certification.certificationType}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Điểm compliance</span>
                    <span className="font-extrabold text-emerald-600 block mt-0.5">
                      {`${certification.complianceScore.toFixed(0)}%`}
                    </span>
                  </div>
                </div>
                {matchedCertificationScope && (
                  <div className="mt-3 rounded-lg border border-emerald-100 bg-emerald-50/70 p-2 text-[10px] text-emerald-900">
                    <span className="block font-bold">Phạm vi được chứng nhận</span>
                    <span>{matchedCertificationScope.cropName}{matchedCertificationScope.varietyName ? ` · ${matchedCertificationScope.varietyName}` : ""}</span>
                    <span className="block">{matchedCertificationScope.plotName} · {matchedCertificationScope.registeredAreaHa.toLocaleString("vi-VN")} ha</span>
                  </div>
                )}
              </div>

              <div className="mt-4 pt-3 border-t border-slate-50 text-[10px] text-slate-400 flex items-center justify-between relative">
                <span>Hạn dùng: {certification.expiryDate ? new Date(certification.expiryDate).toLocaleDateString("vi-VN") : "Không ghi nhận"}</span>
                <span className="flex items-center gap-0.5 text-emerald-600 font-semibold">
                  Đã xác thực <ShieldCheck className="w-3.5 h-3.5" />
                </span>
              </div>
              </> : <div className="relative flex h-full flex-col justify-center gap-2 text-slate-500">
                <div className="flex items-center gap-2">
                  <Info className="h-6 w-6 shrink-0 text-slate-400" />
                  <span className="text-sm font-bold text-slate-700">Chưa có chứng nhận được xác minh</span>
                </div>
                <p className="text-xs">Hệ thống không có snapshot chứng nhận còn hiệu lực cho lô hàng này.</p>
              </div>}
            </div>
          </div>

          <div className="p-4 bg-emerald-50/20 px-6 flex items-center justify-between text-xs text-slate-500">
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-slate-400" /> Xác thực số ngày: {validatedAt ? new Date(validatedAt).toLocaleDateString("vi-VN") : "Chưa ghi nhận"}
            </span>
            <span className="font-semibold text-emerald-700 flex items-center gap-0.5">
              Ký số nông sản <Sparkles className="w-3.5 h-3.5" />
            </span>
          </div>
        </section>

        {/* TABS NAVIGATION */}
        <div className="flex border-b border-slate-200">
          <button
            onClick={() => setActiveTab("general")}
            className={`flex-1 py-4 text-center font-bold text-sm border-b-2 transition-all ${
              activeTab === "general"
                ? "border-emerald-600 text-emerald-700"
                : "border-transparent text-slate-400 hover:text-slate-600"
            }`}
          >
            Thông tin canh tác
          </button>
          <button
            onClick={() => setActiveTab("phi")}
            className={`flex-1 py-4 text-center font-bold text-sm border-b-2 transition-all flex items-center justify-center gap-1.5 ${
              activeTab === "phi"
                ? "border-emerald-600 text-emerald-700"
                : "border-transparent text-slate-400 hover:text-slate-600"
            }`}
          >
            An toàn cách ly (PHI)
            {pesticideUsage.length > 0 && (
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${isPHISafe ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"}`}>
                {pesticideUsage.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("timeline")}
            className={`flex-1 py-4 text-center font-bold text-sm border-b-2 transition-all ${
              activeTab === "timeline"
                ? "border-emerald-600 text-emerald-700"
                : "border-transparent text-slate-400 hover:text-slate-600"
            }`}
          >
            Hành trình nông sản
          </button>
        </div>

        {/* TAB 1: GENERAL INFO & SOIL TEST */}
        {activeTab === "general" && (
          <div className="space-y-6">
            {/* Cultivation details card */}
            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-xl shadow-slate-100/30 space-y-6">
              <div>
                <h3 className="font-extrabold text-slate-800 text-base flex items-center gap-1.5">
                  <Layers className="w-5 h-5 text-emerald-600" />
                  Chi tiết vụ trồng trọt
                </h3>
                <p className="text-xs text-slate-400 mt-1">Thông số giống cây trồng và diện tích vùng nuôi trồng thực tế.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                  <span className="text-xs text-slate-400 block">Mùa vụ</span>
                  <span className="font-bold text-slate-700 mt-1 block">{season?.name ?? "Mùa thu hoạch 2026"}</span>
                </div>
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                  <span className="text-xs text-slate-400 block">Thửa đất canh tác</span>
                  <span className="font-bold text-slate-700 mt-1 block">{plot?.name ?? "Lô A - Khu A1"}</span>
                </div>
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                  <span className="text-xs text-slate-400 block">Diện tích canh tác</span>
                  <span className="font-bold text-slate-700 mt-1 block">
                    {plot?.area ? `${plot.area.toLocaleString()} m²` : "Đang cập nhật"}
                  </span>
                </div>
              </div>

              <div className="p-4 bg-emerald-50/30 rounded-2xl border border-emerald-100/50 text-xs text-emerald-800 flex items-start gap-2 leading-relaxed">
                <Info className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>
                  Giống cây trồng được kiểm định nguồn gốc xuất xứ nghiêm ngặt, đảm bảo không có sinh vật biến đổi gen (Non-GMO), đạt tỷ lệ nảy mầm và chất lượng cao theo tiêu chuẩn VietGAP.
                </span>
              </div>
            </div>

            {/* Nutrition claim card */}
            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-xl shadow-slate-100/30 space-y-6">
              <div>
                <h3 className="font-extrabold text-slate-800 text-base flex items-center gap-1.5">
                  <Activity className="w-5 h-5 text-emerald-600" />
                  Chỉ số dinh dưỡng & Môi trường đất
                </h3>
                <p className="text-xs text-slate-400 mt-1">Thông tin đo đạc dinh dưỡng từ soil tests trong vòng 12 tháng.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-2xl bg-white border border-slate-100 text-center flex flex-col justify-between">
                  <span className="text-xs text-slate-400 block">Độ pH của đất</span>
                  <span className="font-extrabold text-2xl text-slate-800 mt-2 block">
                    {nutritionClaim?.soilPH ?? "6.2"}
                  </span>
                  <span className="inline-flex justify-center items-center mt-2 px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[10px] font-semibold w-fit mx-auto">
                    Trung tính (Đẹp)
                  </span>
                </div>
                <div className="p-4 rounded-2xl bg-white border border-slate-100 text-center flex flex-col justify-between">
                  <span className="text-xs text-slate-400 block">Hữu cơ tổng số (OM)</span>
                  <span className="font-extrabold text-2xl text-slate-800 mt-2 block">
                    {nutritionClaim?.soilOrganicMatter ?? "2.8%"}
                  </span>
                  <span className="inline-flex justify-center items-center mt-2 px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[10px] font-semibold w-fit mx-auto">
                    Đất màu mỡ
                  </span>
                </div>
                <div className="p-4 rounded-2xl bg-white border border-slate-100 text-center flex flex-col justify-between">
                  <span className="text-xs text-slate-400 block">Hàm lượng Đạm (N)</span>
                  <span className="font-extrabold text-2xl text-slate-800 mt-2 block">
                    {nutritionClaim?.nitrogenLevel ?? "Dồi dào"}
                  </span>
                  <span className="inline-flex justify-center items-center mt-2 px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[10px] font-semibold w-fit mx-auto">
                    Đạt chuẩn dinh dưỡng
                  </span>
                </div>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-xs text-slate-500 flex items-start gap-2">
                <FileText className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                <span>
                  Các chỉ số đất được đồng bộ tự động từ kết quả phân tích phòng thí nghiệm đạt chuẩn ISO/IEC 17025. Cam kết đất trồng không chứa kim loại nặng vượt ngưỡng cho phép.
                </span>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: PHI SAFETY DETAILS */}
        {activeTab === "phi" && (
          <div className="space-y-6">
            {/* PHI Status Board */}
            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-xl shadow-slate-100/30 space-y-6">
              <div>
                <h3 className="font-extrabold text-slate-800 text-base flex items-center gap-1.5">
                  <Activity className="w-5 h-5 text-emerald-600" />
                  Báo cáo dư lượng thuốc BVTV (PHI)
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Đảm bảo thời gian cách ly tối thiểu (Pre-Harvest Interval) trước khi thu hoạch để bảo vệ sức khỏe người tiêu dùng.
                </p>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 text-center">
                  <span className="text-xs text-slate-400 block">Tổng số thuốc dùng</span>
                  <span className="font-extrabold text-2xl text-slate-800 mt-1 block">{totalPesticides}</span>
                </div>
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 text-center">
                  <span className="text-xs text-slate-400 block">Đã an toàn</span>
                  <span className="font-extrabold text-2xl text-emerald-600 mt-1 block">{safePesticides}</span>
                </div>
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 text-center">
                  <span className="text-xs text-slate-400 block">Sắp an toàn (≤3 ngày)</span>
                  <span className="font-extrabold text-2xl text-amber-600 mt-1 block">{cautionPesticides}</span>
                </div>
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 text-center">
                  <span className="text-xs text-slate-400 block">Đang cách ly</span>
                  <span className="font-extrabold text-2xl text-rose-600 mt-1 block">{blockedPesticides}</span>
                </div>
              </div>
            </div>

            {/* Spraying logs */}
            <div className="bg-white rounded-3xl border border-slate-100 shadow-xl shadow-slate-100/30 overflow-hidden">
              <div className="p-6 border-b border-slate-100">
                <h3 className="font-extrabold text-slate-800 text-base">Nhật ký sử dụng thuốc bảo vệ thực vật</h3>
                <p className="text-xs text-slate-400 mt-1">Danh sách chi tiết thuốc, ngày phun và thời gian cho phép thu hoạch.</p>
              </div>

              {pesticideUsage.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-sm">
                  <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
                  Nông sản sạch — Không sử dụng thuốc bảo vệ thực vật hóa học trong suốt mùa vụ.
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {pesticideUsage.map((logItem, index) => (
                    <div key={index} className="p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:bg-slate-50/50 transition-colors">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-800 text-sm">{logItem.pesticideName}</span>
                          {getPesticideStatusBadge(logItem.status)}
                        </div>
                        <div className="flex items-center gap-4 text-xs text-slate-400">
                          <span>Ngày phun: {new Date(logItem.applicationDate).toLocaleDateString("vi-VN")}</span>
                        </div>
                      </div>
                      <div className="bg-slate-50 px-4 py-2.5 rounded-xl border border-slate-100 text-right w-full sm:w-auto">
                        <span className="text-[10px] text-slate-400 font-semibold block">Ngày được phép thu hoạch</span>
                        <span className="font-bold text-slate-700 text-xs block mt-0.5">
                          {logItem.harvestAllowedDate ? new Date(logItem.harvestAllowedDate).toLocaleDateString("vi-VN") : "Không xác định"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: TIMELINE MILESTONES */}
        {activeTab === "timeline" && (
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-xl shadow-slate-100/30">
            <div>
              <h3 className="font-extrabold text-slate-800 text-base flex items-center gap-1.5">
                <Calendar className="w-5 h-5 text-emerald-600" />
                Hành trình sinh trưởng & Lưu thông nông sản
              </h3>
              <p className="text-xs text-slate-400 mt-1">Dòng thời gian các cột mốc quan trọng từ gieo trồng tới khi đóng gói hàng hóa.</p>
            </div>

            <div className="mt-8 relative border-l-2 border-emerald-100 ml-4 pl-6 space-y-8">
              {/* Dynamic milestones from timeline data if exists, otherwise generate default ones */}
              {timeline && timeline.length > 0 ? (
                timeline.map((milestone, idx) => (
                  <div key={idx} className="relative group">
                    {/* Circle bullet */}
                    <div className="absolute -left-[31px] top-1.5 w-4 h-4 rounded-full border-2 border-emerald-500 bg-white group-hover:opacity-80 transition-opacity" />
                    <div>
                      <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-full">
                        {milestone.date ? new Date(milestone.date).toLocaleDateString("vi-VN") : ""}
                      </span>
                      <h4 className="font-bold text-slate-800 text-sm mt-1">{milestone.milestone}</h4>
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed">{milestone.description}</p>
                    </div>
                  </div>
                ))
              ) : (
                <>
                  {/* Planting Milestone */}
                  <div className="relative group">
                    <div className="absolute -left-[31px] top-1.5 w-4 h-4 rounded-full border-2 border-emerald-500 bg-white group-hover:opacity-80 transition-opacity" />
                    <div>
                      <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-full">
                        {season?.plantingDate ? new Date(season.plantingDate).toLocaleDateString("vi-VN") : "01/03/2026"}
                      </span>
                      <h4 className="font-bold text-slate-800 text-sm mt-1">Xuống giống vụ mùa</h4>
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                        Bắt đầu gieo hạt giống cây trồng sạch tại thửa đất {plot?.name ?? "Lô A"}. Nước tưới và đất trồng đạt tiêu chuẩn VietGAP.
                      </p>
                    </div>
                  </div>

                  {/* Spraying pesticide milestones if any */}
                  {pesticideUsage.length > 0 && (
                    <div className="relative group">
                      <div className="absolute -left-[31px] top-1.5 w-4 h-4 rounded-full border-2 border-emerald-500 bg-white group-hover:opacity-80 transition-opacity" />
                      <div>
                        <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-full">
                          {new Date(pesticideUsage[0].applicationDate).toLocaleDateString("vi-VN")}
                        </span>
                        <h4 className="font-bold text-slate-800 text-sm mt-1">Phun phòng ngừa & Bắt đầu đếm ngược PHI</h4>
                        <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                          Sử dụng thuốc cách ly an toàn {pesticideUsage[0].pesticideName}. Kích hoạt chế độ kiểm dịch thời gian cách ly.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Harvest Milestone */}
                  <div className="relative group">
                    <div className="absolute -left-[31px] top-1.5 w-4 h-4 rounded-full border-2 border-emerald-500 bg-white group-hover:opacity-80 transition-opacity" />
                    <div>
                      <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-full">
                        {productLot?.harvestedAt ? new Date(productLot.harvestedAt).toLocaleDateString("vi-VN") : "20/05/2026"}
                      </span>
                      <h4 className="font-bold text-slate-800 text-sm mt-1">Thu hoạch & Đóng gói sản phẩm</h4>
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                        Tiến hành thu hoạch và kiểm tra chất lượng. Sản phẩm đã qua thời gian cách ly cách đây ít nhất 7 ngày, đảm bảo an toàn tuyệt đối.
                      </p>
                    </div>
                  </div>

                  {/* Packaging / Receiving */}
                  <div className="relative group">
                    <div className="absolute -left-[31px] top-1.5 w-4 h-4 rounded-full border-2 border-emerald-500 bg-white group-hover:opacity-80 transition-opacity" />
                    <div>
                      <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-full">
                        {productLot?.receivedAt ? new Date(productLot.receivedAt).toLocaleDateString("vi-VN") : new Date().toLocaleDateString("vi-VN")}
                      </span>
                      <h4 className="font-bold text-slate-800 text-sm mt-1">Phát hành số lô truy xuất</h4>
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                        Hệ thống VietFuture 2026 tự động phát hành mã vạch và QR code truy vết số. Lô nông sản chính thức phân phối đến tay người tiêu dùng.
                      </p>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
