import { expect, type Page, type Response } from "@playwright/test";

export function monitorApiFailures(page: Page) {
  const failures: string[] = [];
  const listener = (response: Response) => {
    if (response.url().includes("/api/") && response.status() >= 500) {
      failures.push(`${response.status()} ${response.request().method()} ${response.url()}`);
    }
  };
  page.on("response", listener);

  return {
    assertNone() {
      page.off("response", listener);
      expect(failures, `browser API calls must not return 5xx:\n${failures.join("\n")}`).toEqual([]);
    },
  };
}

export async function expectApiOk(
  responsePromise: Promise<Response>,
  description: string,
) {
  const response = await responsePromise;
  expect(response.ok(), `${description}: HTTP ${response.status()}`).toBeTruthy();
  return response;
}

export async function expectTextAfterReload(page: Page, text: string) {
  await expect(page.getByText(text, { exact: false }).first()).toBeVisible();
  await page.reload();
  await expect(page.getByText(text, { exact: false }).first()).toBeVisible();
}
