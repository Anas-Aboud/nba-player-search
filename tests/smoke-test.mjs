import assert from "node:assert/strict";
import { createReadStream, existsSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import { createServer } from "node:http";
import { dirname, extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const projectRoot = normalize(join(dirname(fileURLToPath(import.meta.url)), ".."));
const screenshotDirectory = join(projectRoot, "docs", "screenshots");
const port = 4173;

const mimeTypes = {
  ".css": "text/css",
  ".html": "text/html",
  ".js": "text/javascript",
  ".png": "image/png",
};

const server = createServer((request, response) => {
  const requestPath = request.url === "/" ? "/index.html" : request.url.split("?")[0];
  const filePath = normalize(join(projectRoot, requestPath));

  if (!filePath.startsWith(projectRoot) || !existsSync(filePath)) {
    response.writeHead(404).end("Not found");
    return;
  }

  response.writeHead(200, { "Content-Type": mimeTypes[extname(filePath)] || "application/octet-stream" });
  createReadStream(filePath).pipe(response);
});

await mkdir(screenshotDirectory, { recursive: true });
await new Promise((resolve) => server.listen(port, "127.0.0.1", resolve));

const browser = await chromium.launch({
  headless: true,
  executablePath: chromium.executablePath(),
});
const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
await context.addInitScript(() => {
  window.APP_CONFIG = { BALLDONTLIE_API_KEY: "test-key" };
});

let responseMode = "success";
await context.route("https://api.balldontlie.io/v1/players**", async (route) => {
  if (responseMode === "failure") {
    await route.fulfill({ status: 503, body: "Service unavailable" });
    return;
  }

  const data = responseMode === "empty"
    ? []
    : [{
        first_name: "LeBron",
        last_name: "James",
        position: "F",
        jersey_number: "23",
        college: "St. Vincent-St. Mary HS",
        team: { full_name: "Los Angeles Lakers", abbreviation: "LAL", conference: "West" },
      }];

  await route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ data }),
  });
});

try {
  const page = await context.newPage();
  await page.goto(`http://127.0.0.1:${port}`);

  await page.getByLabel("Player name").fill("LeBron");
  await page.getByRole("button", { name: "Search" }).click();
  await page.getByRole("cell", { name: "LeBron James" }).waitFor();
  assert.equal(await page.locator("tbody tr").count(), 1);
  assert.match(await page.locator("#status-message").textContent(), /1 player found/);
  await page.screenshot({ path: join(screenshotDirectory, "search-results.png"), fullPage: true });
  console.log("PASS successful search renders player data");

  responseMode = "empty";
  await page.getByLabel("Player name").fill("Unknown Player");
  await page.getByRole("button", { name: "Search" }).click();
  await page.getByText("No players found.").waitFor();
  assert.equal(await page.locator("tbody tr").count(), 0);
  console.log("PASS empty API response shows a clear message");

  responseMode = "failure";
  await page.getByLabel("Player name").fill("Jordan");
  await page.getByRole("button", { name: "Search" }).click();
  await page.getByText("Failed to fetch player data. Please try again.").waitFor();
  console.log("PASS API failure shows a recoverable error");
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
