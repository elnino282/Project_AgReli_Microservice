import { expect, test } from "@playwright/test";
import { authenticate, bearer, loginAs } from "./support/auth";
import { expectApiOk, expectTextAfterReload, monitorApiFailures } from "./support/runtime";

type PageResult<T> = {
  result?: { items?: T[] };
  data?: { items?: T[] };
};

const itemsOf = <T>(payload: PageResult<T>) =>
  payload.result?.items ?? payload.data?.items ?? [];

test.describe("Phase 5 - portal readiness (real network, read-only)", () => {
  test("unauthenticated users cannot enter protected persona routes", async ({ page }) => {
    for (const path of ["/employee/tasks", "/admin/dashboard", "/marketplace/orders"]) {
      await page.goto(path);
      await expect(page).toHaveURL(/\/sign-in(?:\?|$)/);
    }
  });

  test("employee tasks, progress and payroll survive a browser reload", async ({ page }) => {
    await loginAs(page, "employee");
    const failures = monitorApiFailures(page);

    const tasksResponse = page.waitForResponse(
      (response) => response.url().includes("/api/v1/employee/tasks?") && response.request().method() === "GET",
    );
    await page.goto("/employee/tasks");
    const tasksPayload = (await (await expectApiOk(tasksResponse, "employee tasks")).json()) as PageResult<{
      title: string;
      plotName?: string;
    }>;
    const tasks = itemsOf(tasksPayload);
    expect(tasks.length, "employee seed must contain assigned tasks").toBeGreaterThan(0);
    expect(tasks[0].title).toBeTruthy();
    await expectTextAfterReload(page, tasks[0].title);
    if (tasks[0].plotName) {
      await expect(page.getByText(tasks[0].plotName, { exact: false }).first()).toBeVisible();
    }

    const progressResponse = page.waitForResponse(
      (response) => response.url().includes("/api/v1/employee/progress?") && response.request().method() === "GET",
    );
    await page.goto("/employee/progress");
    const progressPayload = (await (await expectApiOk(progressResponse, "employee progress")).json()) as PageResult<{
      taskTitle: string;
    }>;
    const progress = itemsOf(progressPayload);
    expect(progress.length, "employee seed must contain persisted progress").toBeGreaterThan(0);
    await expectTextAfterReload(page, progress[0].taskTitle);

    const payrollResponse = page.waitForResponse(
      (response) => response.url().includes("/api/v1/employee/payroll?") && response.request().method() === "GET",
    );
    await page.goto("/employee/payroll");
    const payrollPayload = (await (await expectApiOk(payrollResponse, "employee payroll")).json()) as PageResult<{
      seasonName: string;
      totalAmount: number;
    }>;
    const payroll = itemsOf(payrollPayload);
    expect(payroll.length, "employee seed must contain persisted payroll").toBeGreaterThan(0);
    expect(payroll[0].totalAmount).toBeGreaterThan(0);
    await expectTextAfterReload(page, payroll[0].seasonName);

    failures.assertNone();
  });

  test("admin dashboard, certification and marketplace read models survive reload", async ({ page }) => {
    await loginAs(page, "admin");
    const failures = monitorApiFailures(page);

    const dashboardResponse = page.waitForResponse(
      (response) => response.url().includes("/api/v1/admin/dashboard-stats") && response.request().method() === "GET",
    );
    await page.goto("/admin/dashboard");
    await expectApiOk(dashboardResponse, "admin dashboard");
    await page.reload();
    await expect(page).toHaveURL(/\/admin\/dashboard/);

    const auditsResponse = page.waitForResponse(
      (response) => response.url().includes("/api/v1/admin/certification-audits") && response.request().method() === "GET",
    );
    await page.goto("/admin/cert-audits");
    const auditsPayload = (await (await expectApiOk(auditsResponse, "admin certification audits")).json()) as {
      result?: Array<{ farmName: string }>;
    };
    expect(auditsPayload.result?.length, "certification seed must contain an audit").toBeGreaterThan(0);
    await expectTextAfterReload(page, auditsPayload.result![0].farmName);

    const productsResponse = page.waitForResponse(
      (response) => response.url().includes("/api/v1/marketplace/admin/products") && response.request().method() === "GET",
    );
    await page.goto("/admin/marketplace-products");
    const productsPayload = (await (await expectApiOk(productsResponse, "admin marketplace products")).json()) as PageResult<{
      name: string;
    }>;
    const products = itemsOf(productsPayload);
    expect(products.length, "marketplace seed must contain a product").toBeGreaterThan(0);
    await expectTextAfterReload(page, products[0].name);

    const ordersResponse = page.waitForResponse(
      (response) => response.url().includes("/api/v1/marketplace/admin/orders") && response.request().method() === "GET",
    );
    await page.goto("/admin/marketplace-orders");
    const ordersPayload = (await (await expectApiOk(ordersResponse, "admin marketplace orders")).json()) as PageResult<{
      orderCode: string;
    }>;
    const orders = itemsOf(ordersPayload);
    expect(orders.length, "marketplace seed must contain an order").toBeGreaterThan(0);
    await expectTextAfterReload(page, orders[0].orderCode);

    failures.assertNone();
  });

  test("buyer order belongs to the signed-in buyer and survives reload", async ({ page }) => {
    const buyer = await loginAs(page, "buyer");
    const failures = monitorApiFailures(page);

    const ordersResponse = page.waitForResponse(
      (response) => response.url().includes("/api/v1/marketplace/orders?") && response.request().method() === "GET",
    );
    await page.goto("/marketplace/orders");
    const ordersPayload = (await (await expectApiOk(ordersResponse, "buyer orders")).json()) as PageResult<{
      id: number;
      orderCode: string;
      buyerUserId: number;
    }>;
    const orders = itemsOf(ordersPayload);
    expect(orders.length, "buyer seed must contain an order").toBeGreaterThan(0);
    expect(orders[0].buyerUserId).toBe(buyer.userId);
    await expectTextAfterReload(page, orders[0].orderCode);

    const detailResponse = page.waitForResponse(
      (response) => response.url().includes(`/api/v1/marketplace/orders/${orders[0].id}`) && response.request().method() === "GET",
    );
    await page.goto(`/marketplace/orders/${orders[0].id}`);
    await expectApiOk(detailResponse, "buyer order detail");
    await expectTextAfterReload(page, orders[0].orderCode);

    failures.assertNone();
  });

  test("backend role boundaries reject cross-persona reads", async ({ request }) => {
    const employee = await authenticate(request, "employee");
    const buyer = await authenticate(request, "buyer");

    const employeeToAdmin = await request.get("/api/v1/admin/dashboard-stats", {
      headers: bearer(employee.token),
    });
    expect(employeeToAdmin.status()).toBe(403);

    const employeeToBuyerOrders = await request.get("/api/v1/marketplace/orders?size=20", {
      headers: bearer(employee.token),
    });
    expect(employeeToBuyerOrders.status()).toBe(403);

    const buyerToEmployee = await request.get("/api/v1/employee/tasks?page=0&size=20", {
      headers: bearer(buyer.token),
    });
    expect(buyerToEmployee.status()).toBe(403);
  });
});
