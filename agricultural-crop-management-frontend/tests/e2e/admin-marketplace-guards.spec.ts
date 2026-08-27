import { test, expect, type Page } from "@playwright/test";
import { loginAs } from "./support/auth";

/**
 * Helper function to verify a route is accessible with expected heading
 */
async function verifyRouteAccess(page: Page, url: string) {
  await page.goto(url);
  await expect(page).toHaveURL(url);
  await expect(page.locator("body")).not.toContainText("Checking authentication...");
}

test.describe("Admin Marketplace Role Guards", () => {
  test("admin user can access marketplace admin routes", async ({ page }) => {
    // Login as admin
    await loginAs(page, "admin");

    // Verify access to all admin marketplace routes
    await verifyRouteAccess(page, "/admin/marketplace-dashboard");
    await verifyRouteAccess(page, "/admin/marketplace-products");
    await verifyRouteAccess(page, "/admin/marketplace-orders");
  });

  test("non-admin user cannot access marketplace admin routes", async ({ page }) => {
    // Login as farmer
    await loginAs(page, "farmer");

    // Attempt to navigate to admin marketplace routes
    await page.goto("/admin/marketplace-dashboard");

    // Should be redirected away from admin routes
    await expect(page).not.toHaveURL("/admin/marketplace-dashboard");

    // Should see unauthorized or redirect to appropriate page
    const url = page.url();
    expect(url).toMatch(/\/(sign-in|farmer|unauthorized)/);
  });

  test("unauthenticated user cannot access marketplace admin routes", async ({ page }) => {
    // Attempt to navigate to admin marketplace routes without login
    await page.goto("/admin/marketplace-products");

    // Should be redirected to signin
    await expect(page).toHaveURL(/\/sign-in/);
  });
});
