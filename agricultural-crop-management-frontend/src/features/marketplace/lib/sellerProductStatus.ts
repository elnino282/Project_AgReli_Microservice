import type {
  MarketplaceProductStatus,
  MarketplaceUpdateProductStatusRequest,
} from "@/shared/api";

export function getNextSellerProductStatusAction(
  status: MarketplaceProductStatus,
): MarketplaceUpdateProductStatusRequest | null {
  switch (status) {
    case "DRAFT":
      return { status: "PENDING_REVIEW" };
    case "PENDING_REVIEW":
      return { status: "DRAFT" };
    case "ACTIVE":
      return { status: "INACTIVE" };
    case "INACTIVE":
    case "HIDDEN":
    case "REJECTED":
    case "SOLD_OUT":
      return { status: "PENDING_REVIEW" };
    case "PUBLISHED":
      return { status: "INACTIVE" };
    default:
      return null;
  }
}

export function getNextSellerProductStatusLabel(
  status: MarketplaceProductStatus,
): string {
  switch (status) {
    case "DRAFT":
      return "Submit for review";
    case "PENDING_REVIEW":
      return "Move back to draft";
    case "ACTIVE":
      return "Hide product";
    case "INACTIVE":
    case "HIDDEN":
    case "REJECTED":
    case "SOLD_OUT":
      return "Submit for review";
    case "PUBLISHED":
      return "Hide product";
    default:
      return "Update status";
  }
}
