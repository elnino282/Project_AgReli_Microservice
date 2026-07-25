import React from 'react';
import { Leaf, Droplets, Sprout, ShieldCheck, Sun, CheckCircle2, FlaskConical, MapPin, CalendarDays, Tractor, Shield } from 'lucide-react';

interface TimelineEvent {
  id: string;
  date: string;
  action: string;
  description: string;
  icon: React.ElementType;
  image?: string;
  isCompleted: boolean;
}

const mockTimeline: TimelineEvent[] = [
  {
    id: '1',
    date: '12 Thg 03, 2026',
    action: 'Gieo hạt giống Đài Thơm 8',
    description: 'Gieo hạt giống thuần chủng tại lô đất L01. Đảm bảo mật độ gieo sạ chuẩn.',
    icon: Sprout,
    image: 'https://images.unsplash.com/photo-1592982537447-6f296a2d1d07?auto=format&fit=crop&q=80&w=600',
    isCompleted: true,
  },
  {
    id: '2',
    date: '25 Thg 03, 2026',
    action: 'Bón phân hữu cơ đợt 1',
    description: 'Sử dụng phân bón hữu cơ vi sinh, tăng cường dưỡng chất cho đất một cách tự nhiên.',
    icon: Leaf,
    image: 'https://images.unsplash.com/photo-1627920769213-9111b15170d1?auto=format&fit=crop&q=80&w=600',
    isCompleted: true,
  },
  {
    id: '3',
    date: '10 Thg 04, 2026',
    action: 'Kiểm tra chất lượng nước tưới',
    description: 'Nguồn nước tưới đạt chuẩn an toàn, không nhiễm phèn, đảm bảo cây sinh trưởng tốt.',
    icon: Droplets,
    isCompleted: true,
  },
  {
    id: '4',
    date: '20 Thg 06, 2026',
    action: 'Thu hoạch lúa chín',
    description: 'Thu hoạch vào lúc sáng sớm, sử dụng máy móc hiện đại giúp giữ nguyên vẹn chất lượng hạt gạo.',
    icon: Tractor,
    image: 'https://images.unsplash.com/photo-1595856403254-20b8f05e36f4?auto=format&fit=crop&q=80&w=600',
    isCompleted: true,
  }
];

export interface TraceabilityProps {
  productInfo: {
    farmName: string;
    season: string;
    name: string;
  };
  safetyMetrics: {
    water: {
      title: string;
      description: string;
      status: string;
    };
    fertilizer: {
      title: string;
      description: string;
      status: string;
    };
  };
  growthTimeline: TimelineEvent[];
}

export const ProductTraceabilityView: React.FC<TraceabilityProps> = ({ 
  productInfo,
  safetyMetrics,
  growthTimeline
}) => {
  return (
    <div className="min-h-screen bg-neutral-50 pb-20 font-sans">
      {/* Header Section */}
      <div className="bg-emerald-900 text-white px-5 py-8 md:px-8 md:py-12 rounded-b-3xl shadow-lg relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full opacity-10 bg-[url('https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&q=80&w=1000')] bg-cover bg-center"></div>
        <div className="relative z-10 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-800/60 border border-emerald-700/50 text-emerald-100 text-xs font-medium mb-4 backdrop-blur-sm">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Nông sản minh bạch</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-display font-bold mb-3 tracking-tight">Hành Trình {productInfo.name}</h1>
          <p className="text-emerald-50 text-base md:text-lg mb-5 opacity-90 leading-relaxed">
            Khám phá quy trình sinh trưởng an toàn, từ hạt giống đến bàn ăn của bạn.
          </p>
          
          <div className="flex flex-wrap items-center gap-4 text-sm font-medium">
            <div className="flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-lg backdrop-blur-md">
              <MapPin className="w-4 h-4 text-emerald-300" />
              <span>{productInfo.farmName}</span>
            </div>
            <div className="flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-lg backdrop-blur-md">
              <CalendarDays className="w-4 h-4 text-emerald-300" />
              <span>{productInfo.season}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 -mt-6 relative z-20">
        
        {/* Safety Metrics Section */}
        <section className="bg-white rounded-2xl p-5 md:p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] mb-8 border border-neutral-100">
          <h2 className="text-lg font-bold text-neutral-800 mb-5 flex items-center gap-2">
            <Shield className="w-5 h-5 text-emerald-600" />
            Chỉ Số An Toàn
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Water Metric */}
            <div className="bg-blue-50/50 rounded-xl p-4 border border-blue-100 flex items-start gap-4 transition-all hover:bg-blue-50">
              <div className="bg-blue-100 text-blue-600 p-2.5 rounded-full shrink-0">
                <Droplets className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-neutral-800 mb-1">{safetyMetrics.water.title}</p>
                <p className="text-xs text-neutral-600 mb-2 leading-relaxed">{safetyMetrics.water.description}</p>
                <div className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-700 bg-blue-100/80 px-2 py-0.5 rounded-md">
                  <CheckCircle2 className="w-3 h-3" />
                  {safetyMetrics.water.status}
                </div>
              </div>
            </div>

            {/* Fertilizer Metric */}
            <div className="bg-emerald-50/50 rounded-xl p-4 border border-emerald-100 flex items-start gap-4 transition-all hover:bg-emerald-50">
              <div className="bg-emerald-100 text-emerald-600 p-2.5 rounded-full shrink-0">
                <FlaskConical className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-neutral-800 mb-1">{safetyMetrics.fertilizer.title}</p>
                <p className="text-xs text-neutral-600 mb-2 leading-relaxed">{safetyMetrics.fertilizer.description}</p>
                <div className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-md">
                  <CheckCircle2 className="w-3 h-3" />
                  {safetyMetrics.fertilizer.status}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Growth Journey Timeline */}
        <section className="bg-white rounded-2xl p-5 md:p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-neutral-100">
          <h2 className="text-lg font-bold text-neutral-800 mb-6 flex items-center gap-2">
            <Sun className="w-5 h-5 text-amber-500" />
            Nhật Ký Sinh Trưởng
          </h2>
          
          <div className="relative pl-3 md:pl-0">
            {/* Vertical Line */}
            <div className="absolute left-[27px] md:left-[39px] top-4 bottom-8 w-px bg-emerald-100"></div>
            
            <div className="space-y-8 relative">
              {growthTimeline.map((event, index) => {
                const Icon = event.icon;
                return (
                  <div key={event.id} className="relative flex items-start group">
                    {/* Timeline Node Icon */}
                    <div className="relative z-10 bg-white ring-4 ring-white rounded-full flex-shrink-0 mt-1">
                      <div className={`w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center border-2 shadow-sm transition-colors duration-300
                        ${event.isCompleted ? 'bg-emerald-50 border-emerald-500 text-emerald-600' : 'bg-neutral-50 border-neutral-300 text-neutral-400'}`}>
                        <Icon className="w-5 h-5 md:w-6 md:h-6" />
                      </div>
                    </div>
                    
                    {/* Content */}
                    <div className="ml-5 md:ml-6 flex-1 pt-1">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-1.5 gap-1">
                        <h3 className="text-base font-bold text-neutral-800">{event.action}</h3>
                        <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full w-fit">
                          {event.date}
                        </span>
                      </div>
                      
                      <p className="text-sm text-neutral-600 mb-3 leading-relaxed">
                        {event.description}
                      </p>
                      
                      {event.image && (
                        <div className="rounded-xl overflow-hidden shadow-sm border border-neutral-100 group-hover:shadow-md transition-shadow duration-300">
                          <img 
                            src={event.image} 
                            alt={event.action} 
                            className="w-full h-40 md:h-56 object-cover hover:scale-105 transition-transform duration-500"
                            loading="lazy"
                            onError={(e) => {
                              e.currentTarget.onerror = null;
                              e.currentTarget.src = "/images.png";
                            }}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </section>
        
        {/* Footer info snippet */}
        <div className="mt-8 text-center pb-6">
          <p className="text-xs text-neutral-500 flex items-center justify-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            Dữ liệu được xác thực và không thể chỉnh sửa
          </p>
        </div>
      </div>
    </div>
  );
};
