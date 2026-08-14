import { beforeEach, describe, expect, it, vi } from "vitest";
import httpClient from "../http";
import { createMarketplaceRealAdapter } from "./real-adapter";

vi.mock("../http", () => ({
  default: {
    get: vi.fn(),
    patch: vi.fn(),
    post: vi.fn(),
  },
}));

type HttpClientMock = {
  get: ReturnType<typeof vi.fn>;
  patch: ReturnType<typeof vi.fn>;
  post: ReturnType<typeof vi.fn>;
};

const mockedHttpClient = httpClient as unknown as HttpClientMock;

const okEnvelope = {
  code: "SUCCESS",
  message: "OK",
  result: {},
};

describe("createMarketplaceRealAdapter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedHttpClient.get.mockResolvedValue({ data: okEnvelope });
    mockedHttpClient.patch.mockResolvedValue({ data: okEnvelope });
    mockedHttpClient.post.mockResolvedValue({ data: okEnvelope });
  });

  it("updates buyer addresses with PATCH", async () => {
    const adapter = createMarketplaceRealAdapter();
    const request = {
      fullName: "Tran Thi B",
      phone: "0912345678",
      province: "TP.HCM",
      district: "Phuong 1",
      ward: "Phuong 1",
      street: "12 Nguyen Trai",
      isDefault: true,
    };

    await adapter.updateAddress(77, request);

    expect(httpClient.patch).toHaveBeenCalledWith(
      "/api/v1/marketplace/addresses/77",
      request,
    );
  });

  it("creates buyer reviews through the canonical order review endpoint", async () => {
    const adapter = createMarketplaceRealAdapter();

    await adapter.createReview({
      orderId: 501,
      orderItemId: 9001,
      rating: 5,
      comment: "San pham tot",
    });

    expect(httpClient.post).toHaveBeenCalledWith(
      "/api/v1/buyer/orders/501/reviews",
      {
        orderItemId: 9001,
        rating: 5,
        comment: "San pham tot",
      },
    );
  });

  it("uploads farmer product images as multipart form data", async () => {
    const adapter = createMarketplaceRealAdapter();
    const file = new File(["image-bytes"], "durian.jpg", { type: "image/jpeg" });

    await adapter.uploadFarmerProductImage(file);

    expect(httpClient.post).toHaveBeenCalledWith(
      "/api/v1/marketplace/farmer/product-images",
      expect.any(FormData),
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      },
    );
  });

  it("requests authoritative shipping quotes from marketplace instead of delivery calculate", async () => {
    const adapter = createMarketplaceRealAdapter();
    const request = {
      addressId: 7,
      recipientProvince: "Lam Dong",
      items: [{ productId: 11, quantity: 2 }],
    };

    await adapter.createShippingQuotes(request);

    expect(httpClient.post).toHaveBeenCalledWith(
      "/api/v1/marketplace/shipping-quotes",
      request,
    );
  });
});
