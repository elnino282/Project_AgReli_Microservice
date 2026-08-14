import { describe, expect, it } from "vitest";

import {
  getNextSellerProductStatusAction,
  getNextSellerProductStatusLabel,
} from "./sellerProductStatus";

describe("seller product status transitions", () => {
  it.each(["INACTIVE", "HIDDEN", "REJECTED", "SOLD_OUT"] as const)(
    "resubmits %s products for admin review instead of publishing directly",
    (status) => {
      expect(getNextSellerProductStatusAction(status)).toEqual({ status: "PENDING_REVIEW" });
      expect(getNextSellerProductStatusLabel(status)).toBe("Submit for review");
    },
  );

  it.each(["ACTIVE", "PUBLISHED"] as const)("allows a farmer to hide %s products", (status) => {
    expect(getNextSellerProductStatusAction(status)).toEqual({ status: "INACTIVE" });
  });
});
