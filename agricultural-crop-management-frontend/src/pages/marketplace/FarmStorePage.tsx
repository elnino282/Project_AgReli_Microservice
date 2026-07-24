import { useEffect, useMemo, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import {
  BadgeCheck,
  ChevronRight,
  ImageOff,
  MapPin,
  MessageCircle,
  PackageOpen,
  Search,
  ShieldCheck,
  ShoppingCart,
  Star,
  Tractor,
  Leaf,
  Droplets,
  Sun,
  Shield,
  Calendar,
  ThumbsUp,
} from "lucide-react";
import { useAuth } from "@/features/auth";
import {
  useMarketplaceAddToCart,
  useMarketplaceFarmDetail,
  useMarketplaceFarmReviews,
  useMarketplaceProducts,
} from "@/features/marketplace/hooks";
import { getCategoryLabel } from "@/features/marketplace/lib/categoryLabels";
import { formatVnd } from "@/features/marketplace/lib/format";
import { Button } from "@/shared/ui";
import {
  MarketplaceFarmDetail,
  MarketplaceProductSummary,
  MarketplaceReview,
} from "@/shared/api";
import "./FarmStorePage.css";

// ── MOCK DATA & INTERFACES FOR PHASE 2 ─────────────────────────
export interface FarmActivityLog {
  id: string;
  date: string;
  action: string;
  description: string;
  images: string[];
  likes: number;
}

export interface SelfDeclaredStandard {
  id: string;
  title: string;
  iconName: "leaf" | "droplets" | "sun" | "shield";
  description: string;
}

const MOCK_ACTIVITY_LOGS: FarmActivityLog[] = [
  {
    id: "log-1",
    date: "Vừa xong",
    action: "Ghi chép: Thu hoạch đợt 1",
    description: "Sáng nay bà con đã bắt đầu thu hoạch những hecta lúa đầu tiên. Thời tiết rất ủng hộ, lúa chín vàng ươm.",
    images: ["https://images.unsplash.com/photo-1595856403254-20b8f05e36f4?auto=format&fit=crop&q=80&w=800"],
    likes: 24
  },
  {
    id: "log-2",
    date: "2 ngày trước",
    action: "Nhật ký: Bón phân vi sinh",
    description: "Tiến hành bón phân hữu cơ vi sinh đợt 2 cho toàn bộ cánh đồng mẫu lớn. Đảm bảo dinh dưỡng tự nhiên cho đất.",
    images: ["https://images.unsplash.com/photo-1627920769213-9111b15170d1?auto=format&fit=crop&q=80&w=800"],
    likes: 15
  },
  {
    id: "log-3",
    date: "5 ngày trước",
    action: "Kiểm tra chất lượng nước",
    description: "Hệ thống lọc sinh học hoạt động tốt, các chỉ số phèn và kim loại nặng đều ở mức an toàn.",
    images: [],
    likes: 42
  }
];

const MOCK_STANDARDS: SelfDeclaredStandard[] = [
  { id: "std-1", title: "100% Hữu cơ", iconName: "leaf", description: "Không dùng hóa chất" },
  { id: "std-2", title: "Nước sạch tinh khiết", iconName: "droplets", description: "Qua hệ thống lọc" },
  { id: "std-3", title: "Thuận tự nhiên", iconName: "sun", description: "Trồng ngoài trời" },
];

const IconMap = { leaf: Leaf, droplets: Droplets, sun: Sun, shield: Shield };
function StandardIcon({ name }: { name: string }) {
  const Icon = IconMap[name as keyof typeof IconMap] || Shield;
  return <Icon className="w-8 h-8 text-emerald-600 mb-3" />;
}
// ──────────────────────────────────────────────────────────────

const SORT_OPTIONS = [
  { value: "newest", label: "Mới nhất" },
  { value: "price_asc", label: "Giá thấp đến cao" },
  { value: "price_desc", label: "Giá cao đến thấp" },
] as const;

type SortValue = (typeof SORT_OPTIONS)[number]["value"];

function fallbackText(value: string | null | undefined, fallback = "Đang cập nhật") {
  const trimmed = value?.trim();
  return trimmed ? trimmed : fallback;
}

function Breadcrumb({ farmName }: { farmName: string }) {
  return (
    <nav className="farm-store-breadcrumb" aria-label="Breadcrumb">
      <Link to="/marketplace">Trang chủ</Link>
      <ChevronRight aria-hidden="true" />
      <Link to="/marketplace/products">Sản phẩm</Link>
      <ChevronRight aria-hidden="true" />
      <span aria-current="page">{farmName}</span>
    </nav>
  );
}

function ProductImage({ src, alt }: { src?: string | null; alt: string }) {
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setHasError(false);
  }, [src]);

  if (!src || hasError) {
    return (
      <div className="fs-product-card__image-fallback overflow-hidden">
        <img src="/png-la-gi-2.png" alt="Placeholder" className="w-full h-full object-cover" />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className="fs-product-card__image"
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={() => setHasError(true)}
    />
  );
}

type FarmHeroProps = {
  farm: MarketplaceFarmDetail;
  isAuthenticated: boolean;
  currentUserId?: number | null;
};

function FarmHero({ farm, isAuthenticated, currentUserId }: FarmHeroProps) {
  const navigate = useNavigate();
  const farmName = fallbackText(farm.name, "Nông trại");
  const ownerUserId = Number(farm.ownerUserId);
  const currentUserNumber = currentUserId == null ? null : Number(currentUserId);
  const isOwner = Boolean(
    Number.isFinite(ownerUserId) &&
      currentUserNumber != null &&
      ownerUserId === currentUserNumber,
  );
  const statusLabel = farm.active ? "Đang hoạt động" : "Tạm ngưng hoạt động";
  const verificationLabel = farm.hasTraceableProducts
    ? "Có sản phẩm truy xuất"
    : "Chưa có sản phẩm truy xuất";

  return (
    <section className="farm-store-hero">
      <div className="farm-store-hero__cover">
        {farm.coverImageUrl ? (
          <img
            src={farm.coverImageUrl}
            alt={`Ảnh bìa ${farmName}`}
            className="farm-store-hero__cover-image"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="farm-store-hero__cover-placeholder overflow-hidden" aria-hidden="true">
            <img src="/png-la-gi-2.png" alt="Placeholder" className="w-full h-full object-cover" />
          </div>
        )}
      </div>

      <div className="farm-store-hero__content">
        <div className="farm-store-hero__identity">
          <div className="farm-store-hero__avatar" aria-hidden="true">
            {farmName.slice(0, 1).toUpperCase()}
          </div>
          <div className="farm-store-hero__text">
            <div className="farm-store-hero__title-row">
              <h1>{farmName}</h1>
              <span className="farm-store-pill">
                <BadgeCheck aria-hidden="true" />
                {verificationLabel}
              </span>
            </div>
            <div className="farm-store-hero__meta">
              <span className="farm-store-status-dot" aria-hidden="true" />
              <span>{statusLabel}</span>
              {farm.region ? (
                <>
                  <span aria-hidden="true">·</span>
                  <span>{farm.region}</span>
                </>
              ) : null}
            </div>
            <p>{farm.description || farm.address || "Nông trại đang cập nhật thông tin giới thiệu."}</p>
          </div>
        </div>

        <div className="farm-store-hero__actions">
          {isOwner ? (
            <button type="button" className="farm-store-primary-action" disabled>
              <MessageCircle aria-hidden="true" />
              Đây là nông trại của bạn
            </button>
          ) : (
            <button
              type="button"
              className="farm-store-primary-action"
              onClick={() => {
                if (!isAuthenticated) {
                  navigate("/sign-in");
                  return;
                }
                if (Number.isFinite(ownerUserId)) {
                  window.dispatchEvent(
                    new CustomEvent("open-chat-widget", {
                      detail: { peerUserId: ownerUserId },
                    })
                  );
                }
              }}
            >
              <MessageCircle aria-hidden="true" />
              Nhắn tin
            </button>
          )}
        </div>
      </div>

      <dl className="farm-store-stats" aria-label="Thông tin nông trại">
        <div>
          <dt>
            <PackageOpen aria-hidden="true" />
            Sản phẩm
          </dt>
          <dd>{farm.productCount ?? 0}</dd>
        </div>
        <div>
          <dt>
            <MapPin aria-hidden="true" />
            Khu vực
          </dt>
          <dd>{fallbackText(farm.region)}</dd>
        </div>
        <div>
          <dt>
            <Star aria-hidden="true" />
            Đánh giá
          </dt>
          <dd>{(farm.ratingAverage ?? 0).toFixed(1)}/5</dd>
          <span>{farm.ratingCount ?? 0} đánh giá</span>
        </div>
        <div>
          <dt>
            <MapPin aria-hidden="true" />
            Địa chỉ
          </dt>
          <dd>{fallbackText(farm.address)}</dd>
        </div>
      </dl>
    </section>
  );
}

import { MarketplaceProductCard } from "@/features/marketplace/components/MarketplaceProductCard";

function ProductCardSkeleton() {
  return (
    <div className="fs-product-card">
      <div className="fs-product-card__skeleton-image" />
      <div className="fs-product-card__skeleton-body">
        <span />
        <span />
        <span />
        <span />
      </div>
    </div>
  );
}

function ReviewsPanel({
  reviews,
  isLoading,
}: {
  reviews: MarketplaceReview[];
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <section className="farm-store-reviews" aria-label="Đánh giá gần đây">
        <div className="farm-store-section-heading">
          <h2>Đánh giá gần đây</h2>
        </div>
        <div className="farm-store-review-grid">
          {Array.from({ length: 3 }, (_, index) => (
            <div key={index} className="farm-store-review-card farm-store-review-card--loading" />
          ))}
        </div>
      </section>
    );
  }

  if (reviews.length === 0) {
    return null;
  }

  return (
    <section className="farm-store-reviews" aria-label="Đánh giá gần đây">
      <div className="farm-store-section-heading">
        <h2>Đánh giá gần đây</h2>
        <span>{reviews.length} nhận xét mới</span>
      </div>
      <div className="farm-store-review-grid">
        {reviews.map((review) => (
          <article key={review.id} className="farm-store-review-card">
            <div className="farm-store-review-card__header">
              <strong>{fallbackText(review.buyerDisplayName, "Người mua")}</strong>
              <span>
                <Star aria-hidden="true" />
                {review.rating}/5
              </span>
            </div>
            <p>{review.comment || "Người mua chưa để lại nội dung đánh giá."}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function LoadingSkeleton() {
  return (
    <div className="farm-store-page">
      <div className="farm-store-page__inner">
        <div className="farm-store-skeleton farm-store-skeleton--breadcrumb" />
        <div className="farm-store-skeleton farm-store-skeleton--hero" />
        <div className="farm-store-skeleton farm-store-skeleton--toolbar" />
        <div className="farm-store-products-grid">
          {Array.from({ length: 4 }, (_, index) => (
            <ProductCardSkeleton key={index} />
          ))}
        </div>
      </div>
    </div>
  );
}

function NotFoundState() {
  return (
    <div className="farm-store-page">
      <div className="farm-store-empty farm-store-empty--standalone">
        <Tractor aria-hidden="true" />
        <h2>Không tìm thấy nông trại</h2>
        <p>Nông trại bạn tìm kiếm không tồn tại hoặc đã bị gỡ khỏi marketplace.</p>
        <Button asChild variant="outline">
          <Link to="/marketplace">Quay về Marketplace</Link>
        </Button>
      </div>
    </div>
  );
}

function ErrorState({ message }: { message?: string }) {
  return (
    <div className="farm-store-page">
      <div className="farm-store-empty farm-store-empty--standalone">
        <PackageOpen aria-hidden="true" />
        <h2>Đã xảy ra lỗi</h2>
        <p>{message ?? "Không thể tải thông tin nông trại. Vui lòng thử lại."}</p>
        <Button asChild variant="outline">
          <Link to="/marketplace">Quay về Marketplace</Link>
        </Button>
      </div>
    </div>
  );
}

export function FarmStorePage() {
  const { farmId: farmIdParam } = useParams<{ farmId: string }>();
  const farmId = Number(farmIdParam);
  const isValidFarmId = Number.isFinite(farmId) && farmId > 0;

  const { isAuthenticated, user } = useAuth();
  const { addToCart, isAdding } = useMarketplaceAddToCart();
  const [searchQuery, setSearchQuery] = useState("");
  const [sortValue, setSortValue] = useState<SortValue>("newest");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [traceableOnly, setTraceableOnly] = useState(false);
  const [activeFarmTab, setActiveFarmTab] = useState<"store" | "logs">("store");

  const farmQuery = useMarketplaceFarmDetail(isValidFarmId ? farmId : undefined);
  const categoryQuery = useMarketplaceProducts(
    isValidFarmId ? { farmId, page: 0, size: 100, sort: "newest" } : undefined,
  );
  const reviewsQuery = useMarketplaceFarmReviews(
    isValidFarmId ? farmId : undefined,
    { page: 0, size: 3 },
  );

  const productQueryParams = useMemo(() => {
    if (!isValidFarmId) return undefined;

    const trimmedSearch = searchQuery.trim();
    return {
      farmId,
      page: 0,
      size: 24,
      sort: sortValue,
      ...(trimmedSearch ? { q: trimmedSearch } : {}),
      ...(selectedCategory ? { category: selectedCategory } : {}),
      ...(traceableOnly ? { traceable: true } : {}),
    };
  }, [farmId, isValidFarmId, searchQuery, selectedCategory, sortValue, traceableOnly]);

  const productsQuery = useMarketplaceProducts(productQueryParams);

  const farm = farmQuery.data;
  const products = productsQuery.data?.items ?? [];
  const totalProducts = productsQuery.data?.totalElements ?? products.length;
  const reviews = reviewsQuery.data?.items ?? [];
  const hasActiveFilters = Boolean(searchQuery.trim() || selectedCategory || traceableOnly);

  const categoryOptions = useMemo(() => {
    const categories = new Set<string>();
    for (const product of categoryQuery.data?.items ?? []) {
      const category = product.category?.trim();
      if (category) categories.add(category);
    }
    return [...categories].sort((a, b) => a.localeCompare(b, "vi"));
  }, [categoryQuery.data]);

  if (!isValidFarmId) return <NotFoundState />;
  if (farmQuery.isLoading) return <LoadingSkeleton />;
  if (farmQuery.isError) return <ErrorState />;
  if (!farm) return <NotFoundState />;

  async function handleAddToCart(productId: number) {
    await addToCart(productId, 1);
  }

  return (
    <div className="farm-store-page">
      <div className="farm-store-page__inner">
        <Breadcrumb farmName={farm.name} />

        <FarmHero
          farm={farm}
          isAuthenticated={isAuthenticated}
          currentUserId={user?.id ?? null}
        />

        {/* ── MOCK WIDGET: Bộ Tiêu Chuẩn Tự Thân ───────────────── */}
        <section className="bg-emerald-50 rounded-2xl p-6 mt-8 mb-8 border border-emerald-100 shadow-sm">
          <div className="flex items-center gap-2 mb-6">
            <ShieldCheck className="w-6 h-6 text-emerald-700" />
            <h2 className="text-xl font-bold text-emerald-900">Bộ Tiêu Chuẩn Tự Thân</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {MOCK_STANDARDS.map(std => (
              <div key={std.id} className="bg-white rounded-xl p-5 shadow-sm flex flex-col items-center text-center hover:shadow-md transition-shadow">
                <StandardIcon name={std.iconName} />
                <h3 className="font-bold text-neutral-800 mb-1">{std.title}</h3>
                <p className="text-sm text-neutral-500">{std.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── HIGH LEVEL TABS: Store vs Activity Log ───────────── */}
        <div className="flex border-b border-neutral-200 mb-8 overflow-x-auto hide-scrollbar">
          <button
            type="button"
            className={`px-6 py-4 font-semibold text-lg border-b-2 whitespace-nowrap transition-colors ${
              activeFarmTab === "store" 
                ? "border-emerald-600 text-emerald-700" 
                : "border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-300"
            }`}
            onClick={() => setActiveFarmTab("store")}
          >
            Cửa hàng nông sản
          </button>
          <button
            type="button"
            className={`px-6 py-4 font-semibold text-lg border-b-2 whitespace-nowrap transition-colors ${
              activeFarmTab === "logs" 
                ? "border-emerald-600 text-emerald-700" 
                : "border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-300"
            }`}
            onClick={() => setActiveFarmTab("logs")}
          >
            Nhật ký nông trại
          </button>
        </div>

        {activeFarmTab === "store" ? (
          <>
            <section className="farm-store-products" aria-labelledby="farm-store-products-title">
              <div className="farm-store-category-tabs" role="tablist" aria-label="Danh mục sản phẩm">
                <button
                  type="button"
                  role="tab"
                  aria-selected={selectedCategory === ""}
                  className={selectedCategory === "" ? "is-active" : ""}
                  onClick={() => setSelectedCategory("")}
                >
                  Tất cả sản phẩm
                </button>
                {categoryOptions.map((category) => (
                  <button
                    key={category}
                    type="button"
                    role="tab"
                    aria-selected={selectedCategory === category}
                    className={selectedCategory === category ? "is-active" : ""}
                    onClick={() => setSelectedCategory(category)}
                  >
                    {getCategoryLabel(category)}
                  </button>
                ))}
              </div>

              <div className="farm-store-products-header">
                <div className="farm-store-section-heading">
                  <h2 id="farm-store-products-title">Sản phẩm ({totalProducts})</h2>
                  <span>{farm.name}</span>
                </div>

                <div className="farm-store-products-toolbar">
                  <label className="farm-store-products-search">
                    <Search aria-hidden="true" />
                    <input
                      type="search"
                      placeholder="Tìm trong cửa hàng"
                      value={searchQuery}
                      onChange={(event) => setSearchQuery(event.target.value)}
                    />
                  </label>

                  <label className="farm-store-products-sort">
                    <span>Sắp xếp</span>
                    <select
                      value={sortValue}
                      onChange={(event) => setSortValue(event.target.value as SortValue)}
                    >
                      {SORT_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <button
                    type="button"
                    className={`farm-store-filter-btn${traceableOnly ? " is-active" : ""}`}
                    aria-pressed={traceableOnly}
                    onClick={() => setTraceableOnly((value) => !value)}
                  >
                    <ShieldCheck aria-hidden="true" />
                    Có truy xuất
                  </button>
                </div>
              </div>

              {productsQuery.isLoading ? (
                <div className="farm-store-products-grid">
                  {Array.from({ length: 4 }, (_, index) => (
                    <ProductCardSkeleton key={index} />
                  ))}
                </div>
              ) : productsQuery.isError ? (
                <div className="farm-store-empty">
                  <PackageOpen aria-hidden="true" />
                  <h3>Không thể tải sản phẩm</h3>
                  <p>Vui lòng thử lại sau ít phút.</p>
                </div>
              ) : products.length > 0 ? (
                <div className="farm-store-products-grid">
                  {products.map((product) => (
                    <MarketplaceProductCard
                      key={product.id}
                      product={product}
                      isAuthenticated={isAuthenticated}
                      isAdding={isAdding}
                      onAddToCart={handleAddToCart}
                    />
                  ))}
                </div>
              ) : hasActiveFilters ? (
                <div className="farm-store-empty">
                  <Search aria-hidden="true" />
                  <h3>Không tìm thấy sản phẩm</h3>
                  <p>Thử thay đổi từ khóa hoặc bộ lọc.</p>
                </div>
              ) : (
                <div className="farm-store-empty">
                  <PackageOpen aria-hidden="true" />
                  <h3>Chưa có sản phẩm</h3>
                  <p>Nông trại chưa đăng bán sản phẩm nào trên marketplace.</p>
                </div>
              )}
            </section>

            <ReviewsPanel reviews={reviews} isLoading={reviewsQuery.isLoading} />
          </>
        ) : (
          <section className="max-w-3xl mx-auto py-8">
            <div className="mb-8 text-center">
              <h2 className="text-2xl font-bold text-neutral-800 mb-2">Nhật Ký Nông Trại</h2>
              <p className="text-neutral-500">Theo dõi các hoạt động canh tác hàng ngày từ {farm.name}</p>
            </div>
            <div className="space-y-8 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-neutral-200 before:to-transparent">
              {MOCK_ACTIVITY_LOGS.map((log) => (
                <div key={log.id} className="relative flex items-start justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-white bg-emerald-100 text-emerald-600 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <div className="w-[calc(100%-3rem)] md:w-[calc(50%-2.5rem)] bg-white p-5 rounded-2xl shadow-sm border border-neutral-100 hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-bold text-neutral-800 text-lg">{log.action}</h4>
                      <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">{log.date}</span>
                    </div>
                    <p className="text-neutral-600 text-sm mb-4 leading-relaxed">{log.description}</p>
                    {log.images.length > 0 && (
                      <div className="rounded-xl overflow-hidden mb-4 border border-neutral-100">
                        <img src={log.images[0]} alt="Activity" className="w-full h-48 object-cover" />
                      </div>
                    )}
                    <div className="flex items-center gap-1.5 text-sm font-medium text-neutral-500 cursor-pointer hover:text-emerald-600 transition-colors">
                      <ThumbsUp className="w-4 h-4" />
                      {log.likes}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
