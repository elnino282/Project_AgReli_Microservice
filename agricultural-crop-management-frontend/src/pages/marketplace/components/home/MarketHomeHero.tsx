import { useEffect, useState } from "react";
import { ArrowRight, Leaf, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/shared/lib";

interface MarketHomeHeroProps {
  heroImageUrl?: string;
  totalFarms?: number;
}

export function MarketHomeHero({ heroImageUrl, totalFarms }: MarketHomeHeroProps) {
  const [mounted, setMounted] = useState(false);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <section className="relative overflow-hidden bg-background px-6 py-20 sm:py-28 lg:px-8">
      <div className="absolute inset-0 -z-10 h-full w-full">
        <div className="absolute inset-0 bg-[url('/hero-farm.png')] bg-cover bg-center opacity-[0.1]" />
        <div className="absolute inset-0 bg-gradient-to-br from-terracotta-50/95 via-background/95 to-background/80" />
      </div>

      <div className="mx-auto max-w-enterprise">
        <div className="grid grid-cols-1 gap-x-12 gap-y-16 lg:grid-cols-2 lg:items-center">
          <div
            className={cn(
              "max-w-2xl transition-all duration-1000 ease-out",
              mounted ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0",
            )}
          >
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-earth-200 bg-white px-3 py-1.5 text-sm font-semibold text-earth-700 shadow-sm">
              <Leaf size={16} aria-hidden="true" className="text-primary" />
              Nông sản minh bạch
            </div>

            <h1 className="font-heading text-4xl font-black tracking-tight text-primary sm:text-6xl lg:text-7xl">
              Nông Sản Sạch,
              <br />
              Rõ Nguồn Gốc
            </h1>

            <p className="mt-6 text-lg leading-8 text-earth-700 font-sans">
              Khám phá nông sản tươi ngon được kết nối trực tiếp với nông trại, mùa vụ và lô thu hoạch thật trong hệ thống hiện tại.
            </p>

            <div className="mt-10 flex items-center gap-x-6">
              <Link
                to="/marketplace/products"
                className="inline-flex items-center justify-center rounded-2xl bg-accent px-8 py-4 text-base font-bold text-white shadow-sm transition-all hover:bg-accent/90 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent hover:-translate-y-0.5"
              >
                Mua sắm ngay
                <ArrowRight size={20} className="ml-2" aria-hidden="true" />
              </Link>
              <Link 
                to="/marketplace/farms"
                className="inline-flex items-center justify-center rounded-2xl bg-primary px-8 py-4 text-base font-bold text-white shadow-sm transition-all hover:bg-primary/90 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary hover:-translate-y-0.5"
              >
                Tìm hiểu thêm
              </Link>
            </div>

            <ul className="mt-10 flex flex-wrap gap-6 text-sm font-medium text-earth-800/80">
              {totalFarms !== undefined && totalFarms > 0 && (
                <li className="flex items-center gap-2">
                  <ShieldCheck size={16} className="text-primary" aria-hidden="true" />
                  {totalFarms} nông trại đối tác
                </li>
              )}
              <li className="flex items-center gap-2">
                <ShieldCheck size={16} className="text-primary" aria-hidden="true" />
                Truy xuất minh bạch
              </li>
              <li className="flex items-center gap-2">
                <ShieldCheck size={16} className="text-primary" aria-hidden="true" />
                Giao toàn quốc
              </li>
            </ul>
          </div>

          <div className="relative w-full">
            {heroImageUrl && !imageError ? (
              <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl shadow-2xl ring-1 ring-earth-900/10">
                <img
                  src={heroImageUrl}
                  alt="Nông trại xanh tươi"
                  className="h-full w-full object-cover"
                  referrerPolicy="no-referrer"
                  onError={() => setImageError(true)}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-earth-950/80 via-earth-900/20 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8">
                  <div className="mb-4 flex flex-wrap gap-2">
                    <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-medium text-white backdrop-blur-md">
                      Có truy xuất
                    </span>
                    <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-medium text-white backdrop-blur-md">
                      Kết nối dữ liệu thật
                    </span>
                  </div>
                  <p className="text-base font-medium text-white/95 sm:text-lg">
                    Thu hoạch minh bạch, giao dịch trực tiếp từ nông trại địa phương
                  </p>
                </div>
              </div>
            ) : (
              <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl shadow-2xl ring-1 ring-earth-900/10">
                <img
                  src="/hero-farm.png"
                  alt="Nông trại xanh tươi"
                  className="h-full w-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-earth-950/80 via-earth-900/20 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8">
                  <div className="mb-4 flex flex-wrap gap-2">
                    <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-medium text-white backdrop-blur-md">
                      Có truy xuất
                    </span>
                    <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-medium text-white backdrop-blur-md">
                      Kết nối dữ liệu thật
                    </span>
                  </div>
                  <p className="text-base font-medium text-white/95 sm:text-lg">
                    Thu hoạch minh bạch, giao dịch trực tiếp từ nông trại địa phương
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
