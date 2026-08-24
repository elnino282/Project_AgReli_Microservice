import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AlertTriangle, ArrowRight, CheckCircle, Info, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  certificationApi,
  type CertificationDetails,
  type CertificationItemDetail,
} from '@/entities/farm/api/certificationApi';
import {
  BackButton,
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Label,
  PageContainer,
  PageHeader,
  RadioGroup,
  RadioGroupItem,
  Textarea,
} from '@/shared/ui';

type Answer = 'YES' | 'NO' | 'NA';

const toAnswer = (status: string): Answer | undefined => {
  if (status === 'PASS') return 'YES';
  if (status === 'FAIL') return 'NO';
  if (status === 'NOT_APPLICABLE') return 'NA';
  return undefined;
};

const toStatus = (answer: Answer) => {
  if (answer === 'YES') return 'PASS';
  if (answer === 'NO') return 'FAIL';
  return 'NOT_APPLICABLE';
};

const hydrateForm = (items: CertificationItemDetail[]) => {
  const answers: Record<number, Answer> = {};
  const notes: Record<number, string> = {};
  items.forEach((item) => {
    const answer = toAnswer(item.status);
    if (answer) answers[item.id] = answer;
    if (item.notes) notes[item.id] = item.notes;
  });
  return { answers, notes };
};

export function SelfAssessmentPage() {
  const { farmId } = useParams();
  const navigate = useNavigate();
  const numericFarmId = Number(farmId);
  const [details, setDetails] = useState<CertificationDetails | null>(null);
  const [answers, setAnswers] = useState<Record<number, Answer>>({});
  const [notes, setNotes] = useState<Record<number, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [showResult, setShowResult] = useState(false);

  const loadAssessment = useCallback(async () => {
    if (!Number.isInteger(numericFarmId) || numericFarmId <= 0) {
      setLoadError(true);
      setIsLoading(false);
      return null;
    }
    setIsLoading(true);
    setLoadError(false);
    try {
      const response = await certificationApi.getCertificationDetails(numericFarmId);
      const manualItems = response.items.filter((item) => item.dataSourceType === 'MANUAL');
      const hydrated = hydrateForm(manualItems);
      setDetails({ ...response, items: manualItems });
      setAnswers(hydrated.answers);
      setNotes(hydrated.notes);
      return manualItems;
    } catch {
      setLoadError(true);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [numericFarmId]);

  useEffect(() => {
    void loadAssessment();
  }, [loadAssessment]);

  const sections = useMemo(() => {
    const grouped = new Map<string, CertificationItemDetail[]>();
    details?.items.forEach((item) => {
      grouped.set(item.category, [...(grouped.get(item.category) ?? []), item]);
    });
    return Array.from(grouped.entries());
  }, [details]);

  const score = useMemo(() => {
    const items = details?.items ?? [];
    const passed = items.filter((item) => answers[item.id] === 'YES').length;
    const failedItems = items.filter((item) => answers[item.id] === 'NO');
    const applicable = items.filter((item) => answers[item.id] !== 'NA').length;
    return {
      passed,
      failed: failedItems.length,
      criticalFails: failedItems.filter((item) => item.isMandatory).length,
      totalQuestions: items.length,
      scorePercent: applicable === 0 ? 0 : Math.round((passed / applicable) * 100),
    };
  }, [answers, details]);

  const handleSubmit = async () => {
    const items = details?.items ?? [];
    if (items.length === 0 || items.some((item) => !answers[item.id])) {
      toast.error('Vui lòng trả lời tất cả tiêu chí tự đánh giá.');
      return;
    }

    setIsSaving(true);
    try {
      await Promise.all(items.map((item) => certificationApi.updateItemStatus(
        numericFarmId,
        item.id,
        {
          status: toStatus(answers[item.id]),
          notes: notes[item.id]?.trim() || undefined,
        },
      )));
      const persistedItems = await loadAssessment();
      if (!persistedItems) throw new Error('Reload failed');
      setShowResult(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      toast.success('Đã lưu kết quả tự đánh giá.');
    } catch {
      toast.error('Không thể lưu đầy đủ kết quả. Dữ liệu đã được tải lại từ máy chủ.');
      await loadAssessment();
    } finally {
      setIsSaving(false);
    }
  };

  const certificationPath = `/farmer/farms/${farmId}/certification`;

  if (isLoading) {
    return <PageContainer><div className="flex min-h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div></PageContainer>;
  }

  if (loadError || !details) {
    return (
      <PageContainer>
        <PageHeader title="Tự đánh giá VietGAP" actions={<BackButton onClick={() => navigate(certificationPath)} />} />
        <Card><CardContent className="space-y-4 pt-6"><p>Không thể tải checklist từ máy chủ.</p><Button onClick={() => void loadAssessment()}>Thử lại</Button></CardContent></Card>
      </PageContainer>
    );
  }

  const isPassed = score.criticalFails === 0 && score.scorePercent >= 80;
  if (showResult) {
    return (
      <PageContainer>
        <PageHeader title="Kết quả tự đánh giá VietGAP" subtitle="Kết quả đã được lưu và tải lại từ hồ sơ chứng nhận." actions={<BackButton onClick={() => setShowResult(false)} label="Xem lại" />} />
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <Card className={isPassed ? 'border-emerald-500' : 'border-red-500'}>
            <CardContent className="flex flex-col items-center gap-4 pt-6 text-center">
              {isPassed ? <CheckCircle className="h-20 w-20 text-emerald-500" /> : <AlertTriangle className="h-20 w-20 text-red-500" />}
              <h2 className="text-2xl font-bold">{isPassed ? 'Đạt yêu cầu nội bộ' : 'Chưa đạt yêu cầu nội bộ'}</h2>
              <p>{score.passed}/{score.totalQuestions} tiêu chí ({score.scorePercent}%)</p>
            </CardContent>
          </Card>
          <Card className="md:col-span-2">
            <CardHeader><CardTitle>Tiêu chí cần khắc phục</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {details.items.filter((item) => answers[item.id] === 'NO').map((item) => (
                <div key={item.id} className="rounded-lg border p-4"><p className="font-medium">{item.description}</p>{notes[item.id] && <p className="mt-2 text-sm text-muted-foreground">{notes[item.id]}</p>}</div>
              ))}
              {score.failed === 0 && <p className="text-emerald-700">Không có tiêu chí thủ công nào được đánh dấu chưa đạt.</p>}
              <div className="flex justify-end border-t pt-4"><Button onClick={() => navigate(certificationPath)}>Quay về quản lý chứng nhận</Button></div>
            </CardContent>
          </Card>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader title="Tự đánh giá VietGAP" subtitle={`Checklist thủ công từ hồ sơ ${details.standardName}.`} actions={<BackButton onClick={() => navigate(certificationPath)} />} />
      <div className="mb-6 flex gap-3 rounded-lg border border-blue-200 bg-blue-50 p-4 text-blue-800"><Info className="h-5 w-5 shrink-0" /><p className="text-sm">Các tiêu chí tự động từ nhật ký, xét nghiệm và PHI được hệ thống xác minh riêng; trang này chỉ cho phép cập nhật tiêu chí MANUAL.</p></div>
      {sections.length === 0 ? (
        <Card><CardContent className="pt-6">Hồ sơ hiện không có tiêu chí thủ công để tự đánh giá.</CardContent></Card>
      ) : sections.map(([category, items]) => (
        <Card key={category} className="mb-6">
          <CardHeader><CardTitle>{category}</CardTitle></CardHeader>
          <CardContent className="divide-y p-0">
            {items.map((item) => (
              <div key={item.id} className="grid gap-4 p-6 md:grid-cols-2">
                <div><p className="font-medium">{item.itemCode} — {item.description}</p>{item.isMandatory && <Badge variant="outline" className="mt-2">Bắt buộc</Badge>}</div>
                <div className="space-y-4">
                  <RadioGroup value={answers[item.id] ?? ''} onValueChange={(value: Answer) => setAnswers((current) => ({ ...current, [item.id]: value }))} className="flex flex-wrap gap-6">
                    <div className="flex items-center gap-2"><RadioGroupItem value="YES" id={`${item.id}-yes`} /><Label htmlFor={`${item.id}-yes`}>Có / Đạt</Label></div>
                    <div className="flex items-center gap-2"><RadioGroupItem value="NO" id={`${item.id}-no`} /><Label htmlFor={`${item.id}-no`}>Không / Chưa đạt</Label></div>
                    <div className="flex items-center gap-2"><RadioGroupItem value="NA" id={`${item.id}-na`} /><Label htmlFor={`${item.id}-na`}>Không áp dụng</Label></div>
                  </RadioGroup>
                  {answers[item.id] === 'NO' && <Textarea aria-label={`Ghi chú ${item.itemCode}`} value={notes[item.id] ?? ''} onChange={(event) => setNotes((current) => ({ ...current, [item.id]: event.target.value }))} placeholder="Nguyên nhân hoặc kế hoạch khắc phục..." />}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
      <div className="sticky bottom-6 mt-8 flex justify-end rounded-xl border bg-background/80 p-4 shadow-lg backdrop-blur-sm"><Button size="lg" className="gap-2" onClick={() => void handleSubmit()} disabled={isSaving || sections.length === 0}>{isSaving && <Loader2 className="h-4 w-4 animate-spin" />}{isSaving ? 'Đang lưu...' : 'Hoàn thành đánh giá'}<ArrowRight className="h-4 w-4" /></Button></div>
    </PageContainer>
  );
}
