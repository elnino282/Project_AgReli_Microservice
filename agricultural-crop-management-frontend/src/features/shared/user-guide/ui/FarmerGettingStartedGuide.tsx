import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  Bot,
  CalendarDays,
  Check,
  CheckCircle2,
  Circle,
  ClipboardCheck,
  FileCheck2,
  LayoutDashboard,
  Lightbulb,
  MapPin,
  Search,
  ShieldCheck,
  ShoppingBasket,
  Sprout,
  Store,
  TriangleAlert,
  Warehouse,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Alert,
  AlertDescription,
  Badge,
  Button,
  Card,
  CardContent,
  Input,
  Progress,
} from "@/shared/ui";
import { cn } from "@/shared/lib/utils";

type FarmerGuideTopicId =
  | "start"
  | "farm"
  | "season"
  | "daily"
  | "safety"
  | "harvest"
  | "vietgap"
  | "sales"
  | "support";

interface GuideAction {
  label: string;
  path: string;
}

interface GuideStep {
  title: string;
  detail: string;
}

interface FarmerGuideTopic {
  id: FarmerGuideTopicId;
  group: string;
  title: string;
  summary: string;
  whenToUse: string;
  duration: string;
  icon: LucideIcon;
  keywords: string[];
  steps: GuideStep[];
  outcome: string;
  cautions?: string[];
  tips?: string[];
  actions: GuideAction[];
}

interface QuickStartStep {
  id: string;
  title: string;
  description: string;
  duration: string;
  path: string;
  icon: LucideIcon;
}

const GUIDE_PROGRESS_STORAGE_KEY = "agreli_farmer_guide_progress_v1";

const quickStartSteps: QuickStartStep[] = [
  {
    id: "dashboard",
    title: "Xem việc cần làm hôm nay",
    description: "Kiểm tra công việc, cảnh báo và mùa vụ đang diễn ra.",
    duration: "2 phút",
    path: "/farmer/dashboard",
    icon: LayoutDashboard,
  },
  {
    id: "farm",
    title: "Kiểm tra nông trại và thửa đất",
    description: "Đảm bảo diện tích, địa chỉ và thông tin đất đã đúng.",
    duration: "4 phút",
    path: "/farmer/farms",
    icon: MapPin,
  },
  {
    id: "season",
    title: "Tạo hoặc mở mùa vụ",
    description: "Chọn cây trồng, thửa đất và ngày thực hiện hợp lý.",
    duration: "4 phút",
    path: "/farmer/seasons",
    icon: CalendarDays,
  },
  {
    id: "supplies",
    title: "Kiểm tra vật tư đầu vào",
    description: "Ghi nhận giống, phân bón và thuốc BVTV trước khi dùng.",
    duration: "3 phút",
    path: "/farmer/suppliers-supplies",
    icon: ShoppingBasket,
  },
  {
    id: "daily",
    title: "Ghi việc thực tế trong mùa vụ",
    description: "Hoàn thành công việc và nhật ký ngay sau khi làm ngoài đồng.",
    duration: "2 phút",
    path: "/farmer/tasks",
    icon: ClipboardCheck,
  },
];

const guideTopics: FarmerGuideTopic[] = [
  {
    id: "start",
    group: "Bắt đầu",
    title: "Bắt đầu đúng cách",
    summary: "Hiểu ba nguyên tắc cốt lõi trước khi thao tác trên AgReli.",
    whenToUse: "Lần đầu đăng nhập hoặc khi chưa biết nên bắt đầu từ màn hình nào.",
    duration: "3 phút đọc",
    icon: Sprout,
    keywords: ["bắt đầu", "tổng quan", "đăng nhập", "dashboard", "người mới"],
    steps: [
      {
        title: "Bắt đầu từ Tổng quan",
        detail:
          "Xem công việc hôm nay, cảnh báo an toàn và mùa vụ đang hoạt động. Đây là màn hình nên kiểm tra đầu tiên mỗi ngày.",
      },
      {
        title: "Ghi nhận ngay sau khi làm thực tế",
        detail:
          "Tưới nước, bón phân, phun thuốc hay thu hoạch đến đâu thì cập nhật đến đó. Hệ thống sẽ dùng các bản ghi này để tạo nhật ký và hồ sơ VietGAP.",
      },
      {
        title: "Không bỏ qua cảnh báo màu đỏ hoặc cam",
        detail:
          "Đọc lý do, dữ liệu liên quan và hành động được đề xuất. Cảnh báo PHI hoặc chứng nhận có thể chặn thu hoạch và bán hàng để bảo vệ an toàn sản phẩm.",
      },
      {
        title: "Chỉ nhập dữ liệu có thể kiểm chứng",
        detail:
          "Ngày thực hiện, số lượng, ảnh và hóa đơn phải phản ánh đúng thực tế. Dữ liệu này sẽ đi vào truy xuất nguồn gốc và hồ sơ chứng nhận.",
      },
    ],
    outcome: "Bạn biết nơi bắt đầu mỗi ngày và hiểu dữ liệu nào cần ghi ngay sau công việc.",
    tips: [
      "Nếu chưa biết tên chức năng, dùng ô tìm kiếm trên thanh đầu trang hoặc hỏi Trợ lý AI bằng câu tự nhiên.",
      "Không cần điền mọi thứ trong một lần; hãy hoàn thành theo đúng thứ tự công việc thực tế.",
    ],
    actions: [
      { label: "Mở Tổng quan", path: "/farmer/dashboard" },
      { label: "Hỏi Trợ lý AI", path: "/farmer/ai-assistant" },
    ],
  },
  {
    id: "farm",
    group: "Thiết lập",
    title: "Nông trại và thửa đất",
    summary: "Tạo nền tảng dữ liệu đúng trước khi bắt đầu một mùa vụ.",
    whenToUse: "Khi thêm nông trại mới, thêm thửa đất hoặc thay đổi diện tích canh tác.",
    duration: "5–10 phút",
    icon: MapPin,
    keywords: ["nông trại", "thửa đất", "diện tích", "địa chỉ", "bản đồ", "đất"],
    steps: [
      {
        title: "Tạo nông trại",
        detail:
          "Nhập tên dễ nhận biết, địa chỉ thực tế và thông tin liên hệ. Một tài khoản có thể quản lý nhiều nông trại.",
      },
      {
        title: "Thêm thửa đất thuộc nông trại",
        detail:
          "Đặt tên thửa, nhập diện tích, loại đất và tình trạng sử dụng. Chọn đúng nông trại sở hữu thửa đất.",
      },
      {
        title: "Kiểm tra diện tích",
        detail:
          "Tổng diện tích các thửa không được vượt quá diện tích nông trại. Sửa ngay nếu hệ thống cảnh báo chênh lệch.",
      },
      {
        title: "Xác nhận trước khi tạo mùa vụ",
        detail:
          "Mở chi tiết thửa đất và kiểm tra lại tên, diện tích, vị trí và trạng thái. Mùa vụ sẽ liên kết cố định với thửa đã chọn.",
      },
    ],
    outcome: "Nông trại và thửa đất đủ thông tin để tạo mùa vụ, phân công và truy xuất.",
    cautions: [
      "Không dùng cùng một thửa cho các mùa vụ đang chồng thời gian nếu hoạt động thực tế không cho phép.",
      "Không xóa thửa đất đang có mùa vụ hoặc công việc liên kết.",
    ],
    actions: [{ label: "Quản lý Nông trại", path: "/farmer/farms" }],
  },
  {
    id: "season",
    group: "Thiết lập",
    title: "Mùa vụ và kế hoạch công việc",
    summary: "Tạo mùa vụ, kích hoạt và tổ chức công việc theo đúng trình tự.",
    whenToUse: "Trước khi gieo trồng hoặc khi bắt đầu theo dõi một đợt sản xuất mới.",
    duration: "8–15 phút",
    icon: CalendarDays,
    keywords: ["mùa vụ", "cây trồng", "giống", "công việc", "kích hoạt", "nhân công"],
    steps: [
      {
        title: "Tạo mùa vụ ở trạng thái Lên kế hoạch",
        detail:
          "Chọn đúng thửa đất, cây trồng, giống, ngày bắt đầu, ngày dự kiến kết thúc và sản lượng dự kiến.",
      },
      {
        title: "Chuẩn bị vật tư và nhân sự",
        detail:
          "Kiểm tra giống, phân bón, thuốc BVTV trong kho; thêm thành viên và đào tạo cần thiết trước khi giao việc.",
      },
      {
        title: "Tạo các công việc chính",
        detail:
          "Lập công việc làm đất, gieo trồng, tưới, bón phân, kiểm tra sâu bệnh và thu hoạch. Giao đúng người và hạn hoàn thành.",
      },
      {
        title: "Kích hoạt mùa vụ",
        detail:
          "Chỉ kích hoạt khi dữ liệu nền đã đúng. Sau khi kích hoạt, dùng Workspace mùa vụ để thực hiện toàn bộ nghiệp vụ hằng ngày.",
      },
    ],
    outcome: "Mùa vụ hoạt động có kế hoạch rõ ràng, đúng thửa đất và đủ công việc cần theo dõi.",
    cautions: ["Kiểm tra kỹ ngày bắt đầu và kết thúc; ngày sai sẽ làm lệch tiến độ và báo cáo."],
    actions: [
      { label: "Quản lý Mùa vụ", path: "/farmer/seasons" },
      { label: "Xem Công việc", path: "/farmer/tasks" },
    ],
  },
  {
    id: "daily",
    group: "Vận hành",
    title: "Công việc và nhật ký hằng ngày",
    summary: "Biến hoạt động ngoài đồng thành nhật ký sản xuất có thể kiểm chứng.",
    whenToUse: "Mỗi ngày trong suốt thời gian mùa vụ đang hoạt động.",
    duration: "3–5 phút/lần",
    icon: ClipboardCheck,
    keywords: ["hằng ngày", "công việc", "nhật ký", "tiến độ", "ảnh", "minh chứng"],
    steps: [
      {
        title: "Mở mùa vụ đang hoạt động",
        detail:
          "Vào Mùa vụ, chọn đúng vụ và mở Workspace. Luôn kiểm tra tên mùa vụ trước khi ghi dữ liệu.",
      },
      {
        title: "Cập nhật công việc sau khi thực hiện",
        detail:
          "Ghi tiến độ, thời gian, số lượng và ghi chú thực tế. Nếu có thể, thêm ảnh minh chứng rõ ngày và khu vực thực hiện.",
      },
      {
        title: "Ghi nhật ký đồng ruộng và sự cố",
        detail:
          "Khi phát hiện sâu bệnh, thiếu nước hoặc bất thường, ghi ngay vị trí, mức độ, diện tích ảnh hưởng và ảnh hiện trường.",
      },
      {
        title: "Kiểm tra báo cáo cuối ngày",
        detail:
          "Đối chiếu công việc đã hoàn thành, công việc quá hạn và bản ghi còn thiếu để tránh phải bổ sung hồi tố.",
      },
    ],
    outcome: "Nhật ký sản xuất phản ánh đúng hoạt động thực tế và sẵn sàng tổng hợp cho VietGAP.",
    tips: ["Ghi ngắn nhưng đủ: làm gì, ở đâu, lúc nào, dùng bao nhiêu và kết quả ra sao."],
    actions: [
      { label: "Mở Công việc", path: "/farmer/tasks" },
      { label: "Mở Nhật ký đồng ruộng", path: "/farmer/field-logs" },
    ],
  },
  {
    id: "safety",
    group: "An toàn",
    title: "Thuốc BVTV và thời gian cách ly PHI",
    summary: "Ghi đúng lần sử dụng thuốc để hệ thống tính ngày thu hoạch an toàn.",
    whenToUse: "Trước và ngay sau mỗi lần phun thuốc hoặc xử lý sâu bệnh.",
    duration: "5 phút/lần",
    icon: ShieldCheck,
    keywords: ["thuốc", "BVTV", "PHI", "cách ly", "sâu bệnh", "điều trị", "an toàn"],
    steps: [
      {
        title: "Chọn đúng mùa vụ và bản ghi bệnh",
        detail:
          "Kiểm tra tên bệnh, ngày phát hiện, diện tích và mức độ ảnh hưởng trước khi thêm lần điều trị.",
      },
      {
        title: "Chọn thuốc từ danh mục có thông tin PHI",
        detail:
          "Ghi tên thương mại/hoạt chất, lượng sử dụng, đơn vị, ngày phun và người thực hiện. Không chọn thuốc không rõ thời gian cách ly.",
      },
      {
        title: "Đọc ngày thu hoạch an toàn sớm nhất",
        detail:
          "Hệ thống tính theo lần sử dụng có hạn cách ly xa nhất. Theo dõi số ngày còn lại trong báo cáo Thuốc BVTV & Tuân thủ.",
      },
      {
        title: "Chỉ thu hoạch khi cổng an toàn cho phép",
        detail:
          "Nếu bị chặn, xem tên thuốc, ngày phun, số ngày PHI và ngày được phép thu hoạch; không thay đổi ngày giả để vượt chặn.",
      },
    ],
    outcome: "Mỗi lần dùng thuốc có lịch sử rõ ràng và mùa vụ có ngày thu hoạch an toàn đáng tin cậy.",
    cautions: [
      "Cảnh báo PHI là rào chắn an toàn bắt buộc, không phải lỗi kỹ thuật.",
      "Nếu thông tin thuốc hoặc PHI chưa rõ, dừng ghi nhận và xác minh nhãn thuốc/người phụ trách.",
    ],
    actions: [
      { label: "Theo dõi Sâu bệnh", path: "/farmer/field-logs" },
      { label: "Mở Báo cáo mùa vụ", path: "/farmer/reports" },
    ],
  },
  {
    id: "harvest",
    group: "Đầu ra",
    title: "Thu hoạch, đóng gói và nhập kho",
    summary: "Tạo lô đầu ra có chất lượng, số lượng và nguồn gốc đầy đủ.",
    whenToUse: "Khi mùa vụ đạt ngày an toàn và cây trồng sẵn sàng thu hoạch.",
    duration: "8–12 phút/lô",
    icon: Warehouse,
    keywords: ["thu hoạch", "lô", "đóng gói", "nhập kho", "chất lượng", "độ ẩm"],
    steps: [
      {
        title: "Kiểm tra cổng thu hoạch",
        detail:
          "Xác nhận không còn vi phạm PHI và mùa vụ đã đủ điều kiện. Đọc cảnh báo trước khi tạo lô.",
      },
      {
        title: "Ghi thông tin lô thu hoạch",
        detail:
          "Nhập ngày, khối lượng, hạng chất lượng, độ ẩm và ghi chú. Các chỉ số nâng cao chỉ nhập khi có đo thực tế.",
      },
      {
        title: "Ghi đóng gói và sơ chế",
        detail:
          "Chọn loại bao bì, số kiện và quy trình sơ chế đúng với cách xử lý thực tế của lô.",
      },
      {
        title: "Nhập kho và kiểm tra mã lô",
        detail:
          "Chọn kho, vị trí lưu, hạn dùng và xác nhận số lượng. Mở chi tiết lô để kiểm tra mùa vụ, nông trại/thửa đất và snapshot an toàn.",
      },
    ],
    outcome: "Lô sản phẩm có mã truy xuất, nguồn mùa vụ, chất lượng và tồn kho chính xác.",
    cautions: ["Không tự ước lượng chỉ số chất lượng nếu chưa đo; để trống trường tùy chọn và bổ sung sau."],
    actions: [
      { label: "Mở Thu hoạch", path: "/farmer/harvest" },
      { label: "Mở Kho sản phẩm", path: "/farmer/product-warehouse" },
    ],
  },
  {
    id: "vietgap",
    group: "Tuân thủ",
    title: "Hồ sơ và chứng nhận VietGAP",
    summary: "Dùng dữ liệu đã ghi để tự động hoàn thiện hồ sơ thay vì làm lại giấy tờ.",
    whenToUse: "Trong suốt mùa vụ và trước khi đăng ký/duy trì chứng nhận.",
    duration: "10–20 phút kiểm tra",
    icon: FileCheck2,
    keywords: ["VietGAP", "chứng nhận", "hồ sơ", "đánh giá", "khắc phục", "bằng chứng"],
    steps: [
      {
        title: "Kiểm tra mức độ đầy đủ của hồ sơ",
        detail:
          "Đối chiếu nhật ký sản xuất, vật tư, nước tưới, đất, đào tạo, đánh giá nội bộ và bằng chứng liên quan.",
      },
      {
        title: "Thực hiện tự đánh giá",
        detail:
          "Trả lời đúng trạng thái thực tế, thêm ghi chú và bằng chứng cho các tiêu chí thủ công. Không đánh dấu đạt khi chưa có căn cứ.",
      },
      {
        title: "Khắc phục điểm chưa phù hợp",
        detail:
          "Xem yêu cầu, người phụ trách và hạn xử lý; tải bằng chứng mới sau khi đã hoàn thành khắc phục ngoài thực tế.",
      },
      {
        title: "Theo dõi vòng đời chứng nhận",
        detail:
          "Theo dõi đăng ký, lịch đánh giá, kết quả, ngày cấp và ngày hết hạn. Chứng nhận hết hạn có thể chặn công khai sản phẩm đạt chuẩn.",
      },
    ],
    outcome: "Hồ sơ VietGAP có dữ liệu nguồn rõ ràng, dễ kiểm tra và sẵn sàng cho đánh giá.",
    cautions: ["Chỉ tài liệu đã được duyệt và chứng nhận còn hiệu lực mới nên dùng làm tuyên bố công khai."],
    actions: [{ label: "Mở Tài liệu VietGAP", path: "/farmer/farm-documents" }],
  },
  {
    id: "sales",
    group: "Đầu ra",
    title: "Đăng bán và xử lý đơn hàng",
    summary: "Đưa lô đủ điều kiện lên Marketplace và theo dõi giao hàng đúng trạng thái.",
    whenToUse: "Sau khi lô sản phẩm đã nhập kho và có dữ liệu truy xuất phù hợp.",
    duration: "8–15 phút",
    icon: Store,
    keywords: ["bán hàng", "marketplace", "sản phẩm", "đơn hàng", "vận chuyển", "doanh thu"],
    steps: [
      {
        title: "Chọn lô đủ điều kiện",
        detail:
          "Kiểm tra tồn kho, mã truy xuất, trạng thái PHI và chứng nhận trước khi tạo sản phẩm bán.",
      },
      {
        title: "Tạo thông tin sản phẩm",
        detail:
          "Nhập tên rõ ràng, hình ảnh thật, đơn vị bán, giá, mô tả và số lượng khả dụng không vượt tồn kho.",
      },
      {
        title: "Gửi duyệt và đọc lý do nếu bị từ chối",
        detail:
          "Hệ thống có thể chặn vì PHI, chứng nhận hết hạn hoặc thiếu truy xuất. Khắc phục dữ liệu nguồn rồi gửi lại.",
      },
      {
        title: "Xử lý đơn theo đúng thứ tự",
        detail:
          "Xác nhận đơn, đóng gói, sẵn sàng lấy hàng và theo dõi vận chuyển. Không bỏ qua trạng thái vì người mua dùng chúng để theo dõi.",
      },
    ],
    outcome: "Sản phẩm được bán từ đúng lô và đơn hàng có trạng thái minh bạch tới khi giao thành công.",
    actions: [
      { label: "Mở Tổng quan bán hàng", path: "/farmer/marketplace-dashboard" },
      { label: "Quản lý Sản phẩm", path: "/farmer/marketplace-products" },
    ],
  },
  {
    id: "support",
    group: "Trợ giúp",
    title: "Khi chưa biết làm gì hoặc gặp lỗi",
    summary: "Cách tự kiểm tra nhanh trước khi cần người hỗ trợ.",
    whenToUse: "Khi không tìm thấy chức năng, dữ liệu không hiện hoặc hệ thống báo lỗi.",
    duration: "2–5 phút",
    icon: Bot,
    keywords: ["trợ giúp", "AI", "lỗi", "không thấy", "hỗ trợ", "chat", "thông báo"],
    steps: [
      {
        title: "Đọc đầy đủ thông báo trên màn hình",
        detail:
          "Phân biệt cảnh báo nghiệp vụ với lỗi kỹ thuật. Ghi lại nội dung, màn hình và thời điểm xảy ra.",
      },
      {
        title: "Kiểm tra đúng nông trại và mùa vụ",
        detail:
          "Nhiều danh sách chỉ hiển thị dữ liệu của mùa vụ đang chọn. Quay lại danh sách mùa vụ nếu nghi ngờ chọn sai.",
      },
      {
        title: "Dùng tìm kiếm hoặc Trợ lý AI",
        detail:
          "Hỏi bằng câu cụ thể, ví dụ: “Tại sao tôi chưa được thu hoạch?” hoặc “Cách thêm lần điều trị bệnh đạo ôn?”. Không gửi mật khẩu hay thông tin bí mật.",
      },
      {
        title: "Gửi thông tin đủ cho người hỗ trợ",
        detail:
          "Cung cấp vai trò, đường dẫn màn hình, mã mùa vụ/lô, thao tác vừa làm và ảnh lỗi. Không chỉ gửi câu “bị lỗi”.",
      },
    ],
    outcome: "Bạn xác định được lỗi do dữ liệu, quy trình hay kỹ thuật và có đủ thông tin để xử lý nhanh.",
    tips: ["Sau khi sửa dữ liệu, tải lại trang và kiểm tra lại trước khi lặp thao tác tạo mới."],
    actions: [
      { label: "Hỏi Trợ lý AI", path: "/farmer/ai-assistant" },
      { label: "Xem Thông báo", path: "/farmer/notifications" },
    ],
  },
];

function normalizeSearch(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("vi")
    .trim();
}

function readStoredProgress(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const stored = window.localStorage.getItem(GUIDE_PROGRESS_STORAGE_KEY);
    const parsed = stored ? (JSON.parse(stored) as unknown) : [];
    return new Set(
      Array.isArray(parsed)
        ? parsed.filter((value): value is string => typeof value === "string")
        : [],
    );
  } catch {
    return new Set();
  }
}

export function FarmerGettingStartedGuide() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState("");
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(readStoredProgress);
  const requestedTopic = searchParams.get("topic") as FarmerGuideTopicId | null;
  const activeTopicId = guideTopics.some((topic) => topic.id === requestedTopic)
    ? requestedTopic!
    : "start";
  const activeTopic = guideTopics.find((topic) => topic.id === activeTopicId) ?? guideTopics[0];

  useEffect(() => {
    try {
      window.localStorage.setItem(
        GUIDE_PROGRESS_STORAGE_KEY,
        JSON.stringify([...completedSteps]),
      );
    } catch {
      // Progress is optional; the guide still works when browser storage is unavailable.
    }
  }, [completedSteps]);

  const visibleTopics = useMemo(() => {
    const normalizedQuery = normalizeSearch(query);
    if (!normalizedQuery) return guideTopics;

    const searchTerms = normalizedQuery.split(/\s+/).filter(Boolean);
    return guideTopics.filter((topic) => {
      const searchableText = normalizeSearch(
        [
          topic.title,
          topic.summary,
          topic.whenToUse,
          ...topic.keywords,
          ...topic.steps.flatMap((step) => [step.title, step.detail]),
        ].join(" "),
      );
      return searchTerms.every((term) => searchableText.includes(term));
    });
  }, [query]);

  const completedCount = quickStartSteps.filter((step) =>
    completedSteps.has(step.id),
  ).length;
  const completionPercentage = Math.round(
    (completedCount / quickStartSteps.length) * 100,
  );

  const selectTopic = (topicId: FarmerGuideTopicId) => {
    const next = new URLSearchParams(searchParams);
    next.set("section", "guide");
    next.set("topic", topicId);
    setSearchParams(next, { replace: true });
  };

  const toggleQuickStep = (stepId: string) => {
    setCompletedSteps((current) => {
      const next = new Set(current);
      if (next.has(stepId)) next.delete(stepId);
      else next.add(stepId);
      return next;
    });
  };

  const ActiveIcon = activeTopic.icon;

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 via-card to-emerald-50/70 p-5 dark:to-emerald-950/20 sm:p-6">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(280px,0.8fr)] lg:items-center">
          <div>
            <Badge variant="secondary" className="mb-3 bg-primary/10 text-primary">
              Dành cho farmer mới sử dụng AgReli
            </Badge>
            <h2 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              Làm đúng việc, đúng thứ tự, hệ thống tự tạo hồ sơ
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground sm:text-base">
              Bạn không cần học toàn bộ hệ thống ngay. Hãy bắt đầu với lộ trình 15 phút,
              sau đó mở đúng chủ đề khi phát sinh công việc ngoài nông trại.
            </p>
            <div className="mt-5 flex flex-wrap gap-2 text-xs sm:text-sm">
              {["Ghi ngay sau khi làm", "Không bỏ qua cảnh báo", "Chỉ nhập dữ liệu thật"].map(
                (principle) => (
                  <span
                    key={principle}
                    className="inline-flex items-center gap-1.5 rounded-full border border-primary/15 bg-background/80 px-3 py-1.5 text-foreground"
                  >
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                    {principle}
                  </span>
                ),
              )}
            </div>
          </div>

          <Card className="border-primary/15 bg-background/90 shadow-sm">
            <CardContent className="p-4 sm:p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium text-foreground">Lộ trình nhập môn</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Tiến độ được lưu trên thiết bị này
                  </p>
                </div>
                <span className="text-2xl font-semibold text-primary">
                  {completedCount}/{quickStartSteps.length}
                </span>
              </div>
              <Progress value={completionPercentage} className="mt-4 h-2" />
              <p className="mt-3 text-sm text-muted-foreground">
                {completionPercentage === 100
                  ? "Bạn đã hoàn thành phần nhập môn. Hãy tiếp tục theo công việc thực tế."
                  : `Còn ${quickStartSteps.length - completedCount} bước để hoàn thành phần nhập môn.`}
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      <section aria-labelledby="quick-start-title">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
          <div>
            <h3 id="quick-start-title" className="text-xl font-semibold text-foreground">
              Khởi động trong khoảng 15 phút
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Làm lần lượt từ trái sang phải; đánh dấu khi bạn đã kiểm tra xong.
            </p>
          </div>
          {completedCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCompletedSteps(new Set())}
            >
              Làm lại lộ trình
            </Button>
          )}
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {quickStartSteps.map((step, index) => {
            const StepIcon = step.icon;
            const isCompleted = completedSteps.has(step.id);
            return (
              <Card
                key={step.id}
                className={cn(
                  "transition-colors",
                  isCompleted && "border-primary/35 bg-primary/[0.04]",
                )}
              >
                <CardContent className="flex h-full flex-col p-4">
                  <div className="flex items-start justify-between gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <StepIcon className="h-5 w-5" />
                    </span>
                    <button
                      type="button"
                      onClick={() => toggleQuickStep(step.id)}
                      className="rounded-full text-muted-foreground transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      aria-label={`${isCompleted ? "Bỏ đánh dấu" : "Đánh dấu hoàn thành"}: ${step.title}`}
                      aria-pressed={isCompleted}
                    >
                      {isCompleted ? (
                        <CheckCircle2 className="h-6 w-6 text-primary" />
                      ) : (
                        <Circle className="h-6 w-6" />
                      )}
                    </button>
                  </div>
                  <p className="mt-3 text-xs font-medium uppercase tracking-wide text-primary">
                    Bước {index + 1} · {step.duration}
                  </p>
                  <h4 className="mt-1 font-medium leading-5 text-foreground">{step.title}</h4>
                  <p className="mt-2 flex-1 text-sm leading-5 text-muted-foreground">
                    {step.description}
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-3 w-full justify-between px-2"
                    onClick={() => navigate(step.path)}
                  >
                    Mở chức năng
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-[310px_minmax(0,1fr)]" aria-label="Nội dung hướng dẫn">
        <aside className="self-start lg:sticky lg:top-4">
          <Card className="overflow-hidden border-border/70 shadow-sm">
            <CardContent className="p-4">
              <h3 className="font-semibold text-foreground">Bạn muốn làm việc gì?</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Tìm theo tên công việc hoặc vấn đề đang gặp.
              </p>
              <div className="relative mt-4">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Ví dụ: thuốc, thu hoạch..."
                  className="pl-9"
                  aria-label="Tìm trong hướng dẫn farmer"
                />
              </div>

              <nav className="mt-4 max-h-[520px] space-y-1 overflow-y-auto pr-1" aria-label="Chủ đề hướng dẫn">
                {visibleTopics.map((topic) => {
                  const TopicIcon = topic.icon;
                  const isActive = topic.id === activeTopic.id;
                  return (
                    <button
                      key={topic.id}
                      type="button"
                      onClick={() => selectTopic(topic.id)}
                      className={cn(
                        "flex w-full items-start gap-3 rounded-xl px-3 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                        isActive
                          ? "bg-primary text-primary-foreground"
                          : "hover:bg-muted",
                      )}
                      aria-current={isActive ? "page" : undefined}
                    >
                      <TopicIcon className="mt-0.5 h-5 w-5 shrink-0" />
                      <span className="min-w-0">
                        <span className="block text-xs opacity-75">{topic.group}</span>
                        <span className="mt-0.5 block font-medium leading-5">{topic.title}</span>
                      </span>
                    </button>
                  );
                })}
                {visibleTopics.length === 0 && (
                  <div className="rounded-xl border border-dashed p-4 text-center text-sm text-muted-foreground">
                    Không tìm thấy chủ đề. Thử từ khóa ngắn hơn như “mùa vụ”, “thuốc” hoặc “kho”.
                  </div>
                )}
              </nav>
            </CardContent>
          </Card>
        </aside>

        <article className="min-w-0 rounded-2xl border border-border/70 bg-card p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-4 border-b border-border/70 pb-5 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex min-w-0 gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <ActiveIcon className="h-6 w-6" />
              </span>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline">{activeTopic.group}</Badge>
                  <span className="text-xs text-muted-foreground">{activeTopic.duration}</span>
                </div>
                <h3 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
                  {activeTopic.title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground sm:text-base">
                  {activeTopic.summary}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-5 rounded-xl bg-muted/60 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">Khi nào cần xem?</p>
            <p className="mt-1 text-sm leading-6 text-foreground">{activeTopic.whenToUse}</p>
          </div>

          <div className="mt-6">
            <h4 className="text-lg font-semibold text-foreground">Các bước thực hiện</h4>
            <ol className="mt-4 space-y-4">
              {activeTopic.steps.map((step, index) => (
                <li key={step.title} className="grid grid-cols-[36px_minmax(0,1fr)] gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary font-semibold text-primary-foreground">
                    {index + 1}
                  </span>
                  <div className="rounded-xl border border-border/70 p-4">
                    <p className="font-medium text-foreground">{step.title}</p>
                    <p className="mt-1.5 text-sm leading-6 text-muted-foreground">{step.detail}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          {activeTopic.cautions && activeTopic.cautions.length > 0 && (
            <Alert className="mt-6 border-amber-300/70 bg-amber-50/70 text-amber-950 dark:bg-amber-950/20 dark:text-amber-100">
              <TriangleAlert className="h-4 w-4" />
              <AlertDescription>
                <p className="font-medium">Điểm cần đặc biệt lưu ý</p>
                <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm leading-5">
                  {activeTopic.cautions.map((caution) => (
                    <li key={caution}>{caution}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {activeTopic.tips && activeTopic.tips.length > 0 && (
            <div className="mt-6 rounded-xl border border-sky-200 bg-sky-50/70 p-4 dark:border-sky-900 dark:bg-sky-950/20">
              <p className="flex items-center gap-2 font-medium text-sky-900 dark:text-sky-100">
                <Lightbulb className="h-5 w-5" />
                Mẹo dễ nhớ
              </p>
              <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm leading-5 text-sky-900/80 dark:text-sky-100/80">
                {activeTopic.tips.map((tip) => (
                  <li key={tip}>{tip}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-6 rounded-xl border border-primary/20 bg-primary/[0.04] p-4">
            <p className="flex items-start gap-2 font-medium text-foreground">
              <Check className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              Kết quả cần thấy
            </p>
            <p className="mt-2 pl-7 text-sm leading-6 text-muted-foreground">
              {activeTopic.outcome}
            </p>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            {activeTopic.actions.map((action, index) => (
              <Button
                key={action.path}
                variant={index === 0 ? "default" : "outline"}
                onClick={() => navigate(action.path)}
              >
                {action.label}
                <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            ))}
          </div>
        </article>
      </section>

      <Alert className="border-primary/20 bg-primary/[0.04]">
        <Bot className="h-4 w-4" />
        <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <span>
            Vẫn chưa chắc nên làm gì? Hãy mô tả mùa vụ, màn hình và điều bạn muốn thực hiện cho Trợ lý AI.
          </span>
          <Button variant="outline" size="sm" onClick={() => navigate("/farmer/ai-assistant")}>
            Mở Trợ lý AI
          </Button>
        </AlertDescription>
      </Alert>
    </div>
  );
}
