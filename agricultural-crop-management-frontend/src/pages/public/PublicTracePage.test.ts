import { describe, expect, it } from "vitest";

import { isCertificationVerified } from "./PublicTracePage";

const publishedCertificate = {
  certificationName: "VietGAP",
  certificationType: "VIETGAP_PLANTING",
  status: "PUBLISHED",
  issuedDate: "2026-01-01",
  expiryDate: "2026-12-31",
  complianceScore: 0,
};

describe("public trace certification verification", () => {
  it("does not verify a missing certification", () => {
    expect(isCertificationVerified(null, new Date("2026-08-14T00:00:00Z"))).toBe(false);
  });

  it("does not verify a pending or expired certification", () => {
    expect(isCertificationVerified({ ...publishedCertificate, status: "PENDING" }, new Date("2026-08-14T00:00:00Z"))).toBe(false);
    expect(isCertificationVerified({ ...publishedCertificate, expiryDate: "2026-08-13" }, new Date("2026-08-14T00:00:00Z"))).toBe(false);
  });

  it("verifies a published certification that has not expired", () => {
    expect(isCertificationVerified(publishedCertificate, new Date("2026-08-14T00:00:00Z"))).toBe(true);
  });
});
