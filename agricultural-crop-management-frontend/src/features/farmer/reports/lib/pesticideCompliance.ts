import type { PesticideRecordResponse } from "@/entities/season";
import type { PesticideRecord, PesticideStatus } from "../types";

const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

const parseLocalDate = (value?: string | null): Date | null => {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const parsed = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const startOfLocalDay = (value: Date): Date =>
  new Date(value.getFullYear(), value.getMonth(), value.getDate());

const resolveCompliance = (
  record: PesticideRecordResponse,
  referenceDate: Date,
): { daysRemaining: number | null; status: PesticideStatus } => {
  const allowedDate = parseLocalDate(record.harvestAllowedDate);
  if (!allowedDate || record.phiDays == null || !record.pesticideName) {
    return { daysRemaining: null, status: "review" };
  }

  const rawDaysRemaining = Math.ceil(
    (allowedDate.getTime() - startOfLocalDay(referenceDate).getTime()) / MILLISECONDS_PER_DAY,
  );

  if (rawDaysRemaining <= 0) {
    return { daysRemaining: 0, status: "safe" };
  }

  return { daysRemaining: rawDaysRemaining, status: "approaching" };
};

export const toPesticideReportRecord = (
  record: PesticideRecordResponse,
  referenceDate = new Date(),
): PesticideRecord => {
  const compliance = resolveCompliance(record, referenceDate);
  return {
    id: record.id,
    lotId: `#${record.id}`,
    chemical: record.pesticideName || record.activeIngredient || null,
    quantity: null,
    unit: null,
    phi: record.phiDays ?? null,
    daysRemaining: compliance.daysRemaining,
    status: compliance.status,
    appliedAt: record.applicationDate,
    harvestAllowedDate: record.harvestAllowedDate,
    activeIngredient: record.activeIngredient,
    dosage: record.dosage,
    applicationMethod: record.applicationMethod,
    targetPest: record.targetPest,
    notes: record.note,
  };
};
