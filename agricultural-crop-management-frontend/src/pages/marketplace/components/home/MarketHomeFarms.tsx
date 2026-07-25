import { ShieldCheck } from "lucide-react";
import { Card, CardContent, ImagePlaceholder } from "@/shared/ui";
import { getGridColsClass } from "@/pages/marketplace/lib/gridLayout";
import { useMarketplaceFarms } from "@/features/marketplace/hooks";

function FarmCardSkeleton() {
  return (
    <Card className="flex flex-col h-full overflow-hidden border-earth-200">
      <div className="aspect-video w-full shrink-0 animate-pulse bg-earth-100 relative" />
      <CardContent className="flex flex-1 flex-col p-8">
        <div className="space-y-3">
          <div className="h-6 w-48 animate-pulse rounded bg-earth-200" />
          <div className="h-4 w-full animate-pulse rounded bg-earth-200" />
          <div className="h-4 w-32 animate-pulse rounded bg-earth-200" />
        </div>
      </CardContent>
    </Card>
  );
}

export function MarketHomeFarms() {
  const farmsQuery = useMarketplaceFarms({ page: 0, size: 2 });
  const featuredFarms = farmsQuery.data?.items ?? [];

  if (farmsQuery.isError) {
    throw new Error("Failed to load partner farms");
  }

  return (
    <section className="bg-background py-16 lg:py-24 relative z-0">
      <div className="absolute inset-0 -z-10 opacity-[0.03]" 
           style={{ backgroundImage: 'radial-gradient(#574b3f 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
      <div className="mx-auto max-w-enterprise px-6">
        <div className="mb-16 text-center">
          <h2 className="font-heading text-3xl font-bold tracking-tight text-earth-900 sm:text-4xl">Nông trại đối tác</h2>
          <p className="mt-4 text-lg text-earth-600">Các hợp tác xã và nông trại đồng hành cùng nền tảng</p>
        </div>

        {farmsQuery.isLoading ? (
          <div className={`${getGridColsClass(2, 2)} gap-8`}>
            {Array.from({ length: 2 }, (_, index) => (
              <FarmCardSkeleton key={index} />
            ))}
          </div>
        ) : featuredFarms.length === 0 ? (
          <div className="mx-auto max-w-2xl rounded-2xl border border-dashed border-earth-300 bg-earth-50 p-12 text-center">
            <p className="text-sm text-earth-600">Chưa có nông trại công khai trên marketplace.</p>
          </div>
        ) : (
          <div className={`${getGridColsClass(featuredFarms.length, 2)} gap-8`}>
            {featuredFarms.map((farm) => (
              <Card key={farm.id} className="flex flex-col h-full overflow-hidden border-primary/10 bg-primary/5 shadow-sm transition-all hover:shadow-md hover:border-primary/30">
                <div className="aspect-video w-full shrink-0 relative">
                  {farm.coverImageUrl ? (
                    <img
                      src={farm.coverImageUrl}
                      alt={farm.name}
                      className="h-full w-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <ImagePlaceholder />
                  )}
                </div>
                <CardContent className="flex flex-1 flex-col p-8">
                  <div className="flex flex-col gap-2 mb-4">
                    <h3 className="font-heading text-2xl font-bold tracking-tight text-earth-900">{farm.name}</h3>
                    {farm.hasTraceableProducts && (
                      <span className="inline-flex w-fit items-center gap-1 bg-primary text-white px-2.5 py-1 rounded-md text-xs font-semibold shadow-sm">
                        <ShieldCheck className="w-3.5 h-3.5 text-white" />
                        Cam kết minh bạch
                      </span>
                    )}
                  </div>
                  <p className="mb-8 line-clamp-2 text-earth-600 leading-relaxed">
                    Nông trại tham gia hệ thống với {farm.productCount} sản phẩm đang được công khai trên sàn.
                  </p>
                  <div className="mt-auto flex items-center justify-between text-sm text-earth-500">
                    <div>
                      <span className="mr-2 font-medium text-earth-800">Khu vực:</span> 
                      {farm.region ?? "Đang cập nhật"}
                    </div>
                    <span className="inline-flex items-center gap-1 text-primary bg-white border border-primary/20 px-2.5 py-1 rounded-md text-xs font-medium">
                      Liên tục cập nhật
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
