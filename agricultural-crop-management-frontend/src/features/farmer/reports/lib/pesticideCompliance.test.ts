import { describe, expect, it } from "vitest";
import type { PesticideRecordResponse } from "@/entities/season";
import { toPesticideReportRecord } from "./pesticideCompliance";

const record: PesticideRecordResponse = {
  id: 1,
  seasonId: 1,
  plotId: 1,
  pesticideName: "Amistar Top 325SC",
  activeIngredient: "Azoxystrobin + Difenoconazole",
  phiDays: 14,
  applicationDate: "2026-07-01",
  harvestAllowedDate: "2026-07-15",
  dosage: "0.3 L/ha",
  targetPest: "Rice blast",
  createdBy: 3,
};

describe("toPesticideReportRecord", () => {
  it("maps a completed PHI record as safe with its traceability fields", () => {
    expect(toPesticideReportRecord(record, new Date(2026, 7, 25))).toMatchObject({
      id: 1,
      chemical: "Amistar Top 325SC",
      activeIngredient: "Azoxystrobin + Difenoconazole",
      dosage: "0.3 L/ha",
      phi: 14,
      daysRemaining: 0,
      status: "safe",
    });
  });

  it("marks an active PHI interval as approaching", () => {
    expect(toPesticideReportRecord(record, new Date(2026, 6, 12))).toMatchObject({
      daysRemaining: 3,
      status: "approaching",
    });
  });

  it("requires review when the allowed harvest date is unavailable", () => {
    expect(
      toPesticideReportRecord({ ...record, harvestAllowedDate: "" }, new Date(2026, 6, 12)),
    ).toMatchObject({ daysRemaining: null, status: "review" });
  });
});
