// Shënim: Testet e subdomain-it kërkojnë konfigurim wildcard DNS lokal.
// Për environment lokal, testohet routing-u bazik i Next.js.

import { test, expect } from '@playwright/test'

test.describe("Public Site Routing — E2E", () => {

  test("rruga /[subdomain] ngarkohet pa crash", async ({ page }) => {
    const response = await page.goto('http://localhost:3000/test-subdomain-route')
    // Should not return 500 — either 200 or 404 is acceptable
    expect(response?.status()).not.toBe(500)
  })

  test("subdomain i panjohur nuk shkakton crash të serverit", async ({ page }) => {
    const response = await page.goto('http://localhost:3000/xyznonexistentbusiness999')
    expect(response?.status()).not.toBe(500)
  })

})
