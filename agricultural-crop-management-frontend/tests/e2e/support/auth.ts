import { expect, type APIRequestContext, type Page } from "@playwright/test";

export type DemoRole = "admin" | "farmer" | "employee" | "buyer";

type DemoAccount = {
  identifier: string;
  password: string;
};

type SignInResult = {
  token: string;
  expiresIn?: number;
  userId?: number;
  username: string;
  email?: string;
  role: string;
  roles?: string[];
  profile?: Record<string, unknown>;
};

const accounts: Record<DemoRole, DemoAccount> = {
  admin: {
    identifier: process.env.DEMO_ADMIN_EMAIL ?? "admin@acm.local",
    password: process.env.DEMO_ADMIN_PASSWORD ?? "admin123",
  },
  farmer: {
    identifier: process.env.DEMO_FARMER_EMAIL ?? "farmer@acm.local",
    password: process.env.DEMO_FARMER_PASSWORD ?? "12345678",
  },
  employee: {
    identifier: process.env.DEMO_EMPLOYEE_EMAIL ?? "employee@acm.local",
    password: process.env.DEMO_EMPLOYEE_PASSWORD ?? "12345678",
  },
  buyer: {
    identifier: process.env.DEMO_BUYER_EMAIL ?? "buyer@acm.local",
    password: process.env.DEMO_BUYER_PASSWORD ?? "12345678",
  },
};

export async function authenticate(
  request: APIRequestContext,
  role: DemoRole,
): Promise<SignInResult> {
  const response = await request.post("/api/v1/auth/sign-in", {
    data: { ...accounts[role], rememberMe: false },
  });
  expect(response.ok(), `${role} demo account must be able to sign in`).toBeTruthy();

  const payload = (await response.json()) as { result?: SignInResult };
  expect(payload.result?.token, `${role} sign-in must return a token`).toBeTruthy();
  expect(payload.result?.role?.toLowerCase()).toBe(role);
  return payload.result!;
}

export async function loginAs(
  page: Page,
  role: DemoRole,
): Promise<SignInResult> {
  const account = accounts[role];
  await page.goto("/sign-in");
  await page.locator('input[type="email"]').fill(account.identifier);
  await page.locator('input[type="password"]').fill(account.password);

  const responsePromise = page.waitForResponse(
    (response) =>
      response.url().includes("/api/v1/auth/sign-in") &&
      response.request().method() === "POST",
  );
  await page.locator('button[type="submit"]').click();

  const response = await responsePromise;
  expect(response.ok(), `${role} UI sign-in must succeed`).toBeTruthy();
  const payload = (await response.json()) as { result?: SignInResult };
  expect(payload.result?.token).toBeTruthy();
  expect(payload.result?.role?.toLowerCase()).toBe(role);
  await expect(page).not.toHaveURL(/\/sign-in(?:\?|$)/);
  return payload.result!;
}

export function bearer(token: string) {
  return { Authorization: `Bearer ${token}` };
}
