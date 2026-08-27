import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { certificationApi, type CertificationDetails } from '@/entities/farm/api/certificationApi';
import { SelfAssessmentPage } from './SelfAssessmentPage';

vi.mock('@/entities/farm/api/certificationApi', async () => {
  const actual = await vi.importActual<typeof import('@/entities/farm/api/certificationApi')>('@/entities/farm/api/certificationApi');
  return {
    ...actual,
    certificationApi: {
      ...actual.certificationApi,
      getCertificationDetails: vi.fn(),
      updateItemStatus: vi.fn(),
    },
  };
});

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const details = (secondStatus: string, secondNotes?: string): CertificationDetails => ({
  recordId: 1,
  farmId: 7,
  standardCode: 'VIETGAP-PLANTING-2026',
  standardName: 'VietGAP',
  complianceScore: 50,
  status: 'IN_PROGRESS',
  scopes: [],
  isEligible: false,
  missingMandatoryEvidenceCount: 1,
  missingEvidenceItems: [],
  items: [
    { id: 11, itemCode: 'PA-003', category: 'PRODUCTION_AREA', description: 'Có sơ đồ mặt bằng', isMandatory: true, weightPct: 3, dataSourceType: 'MANUAL', dataSourceQuery: '', status: 'PASS', notes: 'Đã lưu' },
    { id: 12, itemCode: 'HV-002', category: 'HARVEST', description: 'Bảo quản đúng cách', isMandatory: true, weightPct: 2, dataSourceType: 'MANUAL', dataSourceQuery: '', status: secondStatus, notes: secondNotes },
    { id: 13, itemCode: 'CU-003', category: 'CULTIVATION', description: 'Tuân thủ PHI', isMandatory: true, weightPct: 5, dataSourceType: 'PHI_CHECK', dataSourceQuery: '', status: 'PASS' },
  ],
});

describe('SelfAssessmentPage', () => {
  beforeEach(() => {
    vi.mocked(certificationApi.getCertificationDetails)
      .mockReset()
      .mockResolvedValueOnce(details('PENDING'))
      .mockResolvedValueOnce(details('FAIL', 'Cần bổ sung kho lạnh'));
    vi.mocked(certificationApi.updateItemStatus).mockReset().mockResolvedValue('ok');
    Object.defineProperty(window, 'scrollTo', { value: vi.fn(), writable: true });
  });

  it('loads real manual items, persists answers, then renders reloaded server state', async () => {
    render(
      <MemoryRouter initialEntries={['/farmer/farms/7/self-assessment']}>
        <Routes><Route path="/farmer/farms/:farmId/self-assessment" element={<SelfAssessmentPage />} /></Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText(/Có sơ đồ mặt bằng/)).toBeInTheDocument();
    expect(screen.getByText(/Bảo quản đúng cách/)).toBeInTheDocument();
    expect(screen.queryByText(/Tuân thủ PHI/)).not.toBeInTheDocument();

    const radios = screen.getAllByRole('radio');
    expect(radios[0]).toHaveAttribute('aria-checked', 'true');
    fireEvent.click(radios[4]);
    fireEvent.change(screen.getByLabelText('Ghi chú HV-002'), { target: { value: 'Cần bổ sung kho lạnh' } });
    fireEvent.click(screen.getByRole('button', { name: /Hoàn thành đánh giá/ }));

    await waitFor(() => expect(certificationApi.updateItemStatus).toHaveBeenCalledTimes(2));
    expect(certificationApi.updateItemStatus).toHaveBeenCalledWith(7, 12, {
      status: 'FAIL',
      notes: 'Cần bổ sung kho lạnh',
    });
    expect(await screen.findByText('Chưa đạt yêu cầu nội bộ')).toBeInTheDocument();
    expect(certificationApi.getCertificationDetails).toHaveBeenCalledTimes(2);
  });
});
