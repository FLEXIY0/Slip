import { chromium } from "playwright-core";
import fs from "node:fs";

const EXE = "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const OUT = process.env.SHOT_DIR || "/tmp/shots";
fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({
  executablePath: EXE,
  args: ["--no-sandbox", "--force-color-profile=srgb"],
});

async function shoot(name, { width, height, dark, steps }) {
  const ctx = await browser.newContext({
    viewport: { width, height },
    deviceScaleFactor: 2,
    colorScheme: dark ? "dark" : "light",
  });
  const page = await ctx.newPage();
  await page.addInitScript((d) => {
    try { localStorage.setItem("slip.theme", d ? "dark" : "light"); } catch {}
  }, dark);
  await page.goto("http://localhost:4599/", { waitUntil: "networkidle" });
  if (steps) await steps(page);
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}/${name}.png` });
  await ctx.close();
  console.log("shot", name);
}

const enter = async (page) => {
  await page.getByRole("button", { name: "Open app" }).click().catch(() => {});
  await page.waitForTimeout(300);
};
const nav = (label) => async (page) => {
  await enter(page);
  await page.getByRole("button", { name: label, exact: true }).first().click();
  await page.waitForTimeout(300);
};

await shoot("landing-dark", { width: 1280, height: 900, dark: true });
await shoot("landing-light", { width: 1280, height: 900, dark: false });
await shoot("compress-dark", { width: 1280, height: 860, dark: true, steps: enter });
await shoot("compress-light", { width: 1280, height: 860, dark: false, steps: enter });
await shoot("history-dark", { width: 1280, height: 860, dark: true, steps: nav("History") });
await shoot("settings-dark", { width: 1280, height: 860, dark: true, steps: nav("Settings") });
await shoot("mobile-compress", { width: 402, height: 850, dark: true, steps: enter });

await browser.close();
console.log("done");
