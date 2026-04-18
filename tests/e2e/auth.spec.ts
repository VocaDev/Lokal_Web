// Këto teste kërkojnë serverin të jetë aktiv: npm run dev
// Ekzekuto me: npx playwright test tests/e2e/auth.spec.ts

import { test, expect } from '@playwright/test'

test.describe("Auth Flow — E2E", () => {

  test("faqja /login ngarkohet dhe shfaq formularin", async ({ page }) => {
    await page.goto('http://localhost:3000/login')
    await expect(page.locator('input[type="email"]')).toBeVisible()
    await expect(page.locator('input[type="password"]')).toBeVisible()
    await expect(page.locator('button[type="submit"]')).toBeVisible()
  })

  test("kredencialet e gabuara shfaqin mesazh gabimi", async ({ page }) => {
    await page.goto('http://localhost:3000/login')
    await page.fill('input[type="email"]', 'fake@test.com')
    await page.fill('input[type="password"]', 'wrongpassword123')
    await page.click('button[type="submit"]')
    // expect some visible error — check for any error text element
    await expect(page.locator('text=/gabim|error|invalid|pasaktë/i')).toBeVisible({ timeout: 10000 })
  })

  test("/dashboard pa sesion ridrejton në /login", async ({ page }) => {
    await page.goto('http://localhost:3000/dashboard')
    await expect(page).toHaveURL(/login/)
  })

})
