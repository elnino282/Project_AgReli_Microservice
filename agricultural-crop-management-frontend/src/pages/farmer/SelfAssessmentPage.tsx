import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useI18n } from "@/shared/lib/hooks/useI18n";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Badge,
  PageContainer,
  PageHeader,
  BackButton,
  RadioGroup,
  RadioGroupItem,
  Label,
  Textarea
} from "@/shared/ui";
import { CheckCircle, AlertTriangle, Info, ArrowRight } from "lucide-react";
import { toast } from "sonner";

// Mock checklist data
const CHECKLIST_SECTIONS = [
  {
    id: "s1",
    title: "1. Đánh giá rủi ro và quản lý khu vực sản xuất",
    questions: [
      { id: "q1", text: "Có đánh giá rủi ro mối nguy an toàn thực phẩm, môi trường không?", required: true },
      { id: "q2", text: "Khu vực sản xuất có bị ô nhiễm hóa học hoặc sinh học không?", required: true, expects: "NO" },
    ]
  },
  {
    id: "s2",
    title: "2. Quản lý giống và gốc ghép",
    questions: [
      { id: "q3", text: "Có ghi chép nguồn gốc giống, hồ sơ mua giống rõ ràng không?", required: true },
      { id: "q4", text: "Giống có chứng nhận sạch bệnh hoặc kiểm dịch thực vật không?", required: false },
    ]
  },
  {
    id: "s3",
    title: "3. Quản lý đất và giá thể",
    questions: [
      { id: "q5", text: "Đất trồng có được phân tích kim loại nặng, dư lượng hóa chất định kỳ không?", required: true },
    ]
  }
];

export function SelfAssessmentPage() {
  const { farmId } = useParams();
  const { t } = useI18n();
  const navigate = useNavigate();

  const [answers, setAnswers] = useState<Record<string, "YES" | "NO" | "NA">>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [showResult, setShowResult] = useState(false);

  const calculateScore = () => {
    let passed = 0;
    let failed = 0;
    let criticalFails = 0;

    CHECKLIST_SECTIONS.forEach(section => {
      section.questions.forEach(q => {
        const answer = answers[q.id];
        const expected = q.expects || "YES";
        
        if (answer === expected) {
          passed++;
        } else if (answer && answer !== "NA") {
          failed++;
          if (q.required) criticalFails++;
        }
      });
    });

    const totalQuestions = CHECKLIST_SECTIONS.reduce((sum, s) => sum + s.questions.length, 0);
    const scorePercent = Math.round((passed / totalQuestions) * 100);
    
    return { passed, failed, criticalFails, totalQuestions, scorePercent };
  };

  const handleSubmit = () => {
    // Validate if all required questions are answered
    let missingRequired = false;
    CHECKLIST_SECTIONS.forEach(section => {
      section.questions.forEach(q => {
        if (!answers[q.id]) {
          missingRequired = true;
        }
      });
    });

    if (missingRequired) {
      toast.error("Vui lòng trả lời tất cả các câu hỏi trong biểu mẫu.");
      return;
    }

    setShowResult(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const score = calculateScore();
  const isPassed = score.criticalFails === 0 && score.scorePercent >= 80;

  if (showResult) {
    return (
      <PageContainer>
        <div className="mb-6">
          <PageHeader 
            title="Kết quả tự đánh giá VietGAP" 
            subtitle="Báo cáo kết quả tự kiểm tra mức độ tuân thủ tiêu chuẩn."
            actions={<BackButton onClick={() => setShowResult(false)} label="Làm lại" />}
          />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className={`md:col-span-1 border-2 ${isPassed ? 'border-emerald-500 bg-emerald-50/50' : 'border-red-500 bg-red-50/50'}`}>
            <CardContent className="pt-6 flex flex-col items-center justify-center text-center space-y-4">
              {isPassed ? (
                <CheckCircle className="w-20 h-20 text-emerald-500" />
              ) : (
                <AlertTriangle className="w-20 h-20 text-red-500" />
              )}
              
              <div>
                <h2 className="text-2xl font-bold">{isPassed ? 'Đạt Yêu Cầu' : 'Chưa Đạt Yêu Cầu'}</h2>
                <p className="text-muted-foreground mt-2">
                  Bạn đạt {score.passed}/{score.totalQuestions} tiêu chí ({score.scorePercent}%)
                </p>
                {score.criticalFails > 0 && (
                  <Badge variant="destructive" className="mt-4 text-sm">
                    Có {score.criticalFails} tiêu chí trọng yếu không đạt
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Gợi ý khắc phục (Khuyến nghị từ AI)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {score.failed === 0 ? (
                <p className="text-emerald-700">Tuyệt vời! Nông trại của bạn đang tuân thủ rất tốt các tiêu chuẩn VietGAP. Hãy duy trì trạng thái này.</p>
              ) : (
                <ul className="space-y-4">
                  {CHECKLIST_SECTIONS.map(section => 
                    section.questions.filter(q => {
                      const expected = q.expects || "YES";
                      return answers[q.id] && answers[q.id] !== expected && answers[q.id] !== "NA";
                    }).map(q => (
                      <li key={q.id} className="flex gap-3 bg-muted/50 p-4 rounded-lg border border-border">
                        <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-medium text-sm text-foreground">{q.text}</p>
                          <p className="text-sm text-muted-foreground mt-1">
                            {q.expects === "NO" ? "Hành động: Bạn cần loại bỏ rủi ro này ngay lập tức. Xác định nguyên nhân và tiến hành cách ly khu vực bị ảnh hưởng." : "Hành động: Bổ sung hồ sơ đánh giá/ghi chép hoặc thực hiện kiểm tra định kỳ."}
                          </p>
                          {notes[q.id] && (
                            <p className="text-xs text-slate-500 mt-2 bg-white p-2 rounded border">Ghi chú của bạn: {notes[q.id]}</p>
                          )}
                        </div>
                      </li>
                    ))
                  )}
                </ul>
              )}
              
              <div className="pt-4 border-t mt-6 flex justify-end">
                <Button onClick={() => navigate(`/farmer/farms/${farmId}/certification`)}>
                  Quay về Quản lý Chứng nhận
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <div className="mb-6">
        <PageHeader 
          title="Tự đánh giá VietGAP" 
          subtitle="Checklist tự kiểm tra nội bộ trước khi đăng ký đánh giá chính thức."
          actions={<BackButton onClick={() => navigate(`/farmer/farms/${farmId}/certification`)} />}
        />
      </div>

      <div className="bg-blue-50 text-blue-800 p-4 rounded-lg flex gap-3 mb-6 border border-blue-200">
        <Info className="w-5 h-5 shrink-0" />
        <p className="text-sm">
          Bài đánh giá này giúp bạn tự kiểm tra mức độ sẵn sàng của nông trại đối với tiêu chuẩn VietGAP. 
          Kết quả đánh giá mang tính chất tham khảo nội bộ và không có giá trị pháp lý thay thế cho giấy chứng nhận chính thức.
        </p>
      </div>

      <div className="space-y-8">
        {CHECKLIST_SECTIONS.map((section) => (
          <Card key={section.id} className="shadow-sm">
            <CardHeader className="bg-muted/30 border-b">
              <CardTitle className="text-lg">{section.title}</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y">
                {section.questions.map((q, index) => (
                  <div key={q.id} className="p-6 md:flex gap-6 items-start hover:bg-slate-50 transition-colors">
                    <div className="md:w-1/2 mb-4 md:mb-0">
                      <p className="font-medium text-slate-800">
                        {index + 1}. {q.text}
                        {q.required && <span className="text-red-500 ml-1" title="Tiêu chí trọng yếu (Bắt buộc)">*</span>}
                      </p>
                      {q.required && (
                        <Badge variant="outline" className="mt-2 text-xs text-amber-600 border-amber-200 bg-amber-50">
                          Tiêu chí trọng yếu
                        </Badge>
                      )}
                    </div>
                    <div className="md:w-1/2 space-y-4">
                      <RadioGroup 
                        value={answers[q.id]} 
                        onValueChange={(val: any) => setAnswers(prev => ({ ...prev, [q.id]: val }))}
                        className="flex gap-6"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="YES" id={`${q.id}-yes`} />
                          <Label htmlFor={`${q.id}-yes`}>Có / Đạt</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="NO" id={`${q.id}-no`} />
                          <Label htmlFor={`${q.id}-no`}>Không / Chưa đạt</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="NA" id={`${q.id}-na`} />
                          <Label htmlFor={`${q.id}-na`} className="text-muted-foreground">K/A (Không áp dụng)</Label>
                        </div>
                      </RadioGroup>

                      {answers[q.id] && answers[q.id] !== (q.expects || "YES") && answers[q.id] !== "NA" && (
                        <div className="pt-2">
                          <Textarea 
                            placeholder="Ghi chú nguyên nhân hoặc kế hoạch khắc phục..."
                            value={notes[q.id] || ""}
                            onChange={(e) => setNotes(prev => ({ ...prev, [q.id]: e.target.value }))}
                            className="text-sm"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-8 flex justify-end sticky bottom-6 z-10 bg-background/80 backdrop-blur-sm p-4 rounded-xl border shadow-lg">
        <Button size="lg" className="gap-2" onClick={handleSubmit}>
          Hoàn thành đánh giá <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </PageContainer>
  );
}
