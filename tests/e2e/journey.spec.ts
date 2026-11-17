import { readFile } from 'node:fs/promises'
import { expect, test } from '@playwright/test'
import type { Locator, Page } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

async function focusWithTab(page: Page, item: Locator) {
  await expect(item).toBeVisible()
  for (let i = 0; i < 100; i++) {
    if (await item.evaluate((el) => el === document.activeElement)) return
    await page.keyboard.press('Tab')
  }
  throw new Error('The control could not be reached by keyboard.')
}
async function activate(page: Page, item: Locator) {
  await focusWithTab(page, item)
  await page.keyboard.press('Enter')
}
async function enter(page: Page, item: Locator, value: string) {
  await focusWithTab(page, item)
  await page.keyboard.insertText(value)
}
const confirm = (page: Page, name: string) =>
  page.getByRole('dialog').getByRole('button', { name, exact: true })

test('keyboard lifecycle: request, QR, customer view, approval, partial repayment, settlement, PopAI, export, reset', async ({
  page,
  browser,
}) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text())
  })
  const landing = await page.goto('/')
  expect(landing?.headers()['content-security-policy']).toContain("script-src 'self'")
  await expect(page.getByRole('heading', { name: 'Udhaar, without the uncertainty.' })).toBeVisible()
  await activate(page, page.getByRole('link', { name: 'Explore Interactive Demo' }))
  await expect(page.getByRole('heading', { name: 'Business overview', level: 1 })).toBeVisible()
  await expect(page.getByText('₹48,650', { exact: true })).toBeVisible()
  await activate(page, page.getByRole('button', { name: 'Create credit', exact: true }))
  await enter(page, page.getByLabel('Amount (₹)', { exact: false }), '500.50')
  await enter(page, page.getByLabel('Description'), 'Keyboard journey')
  await activate(page, confirm(page, 'Preview PopCard'))
  await expect(page.getByRole('dialog').getByText('₹500.50', { exact: true })).toBeVisible()
  await activate(page, confirm(page, 'Generate PopCard'))
  await expect(page.getByRole('heading', { name: 'Your PopCard is ready' })).toBeVisible()
  const url = await page.getByLabel('Shareable demo link').inputValue()
  const png = page.waitForEvent('download')
  await activate(page, page.getByRole('button', { name: 'Download PNG' }))
  const download = await png
  expect(download.suggestedFilename()).toMatch(/-demo\.png$/)
  expect((await readFile((await download.path())!)).subarray(0, 8)).toEqual(
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
  )
  const other = await browser.newContext()
  try {
    const remote = await other.newPage()
    await remote.goto(url)
    await expect(remote.getByRole('heading', { name: 'A PopCard for everyday credit' })).toBeVisible()
    await expect(remote.getByText('Keyboard journey', { exact: true })).toHaveCount(0)
    await expect(remote.getByRole('button', { name: 'Approve request' })).toHaveCount(0)
    await remote.goto(url.replace(/#card=.*/, '#card=123_'))
    await expect(remote.getByRole('heading', { name: 'Unable to open this PopCard' })).toBeVisible()
  } finally {
    await other.close()
  }
  await activate(page, page.getByRole('link', { name: 'Open as customer' }))
  await expect(page.getByRole('heading', { name: 'Hi, Rahul.' })).toBeVisible()
  await expect(
    page.getByRole('region', { name: 'Credit records' }).getByText('Keyboard journey'),
  ).toBeVisible()
  await activate(page, page.getByRole('link', { name: 'Merchant', exact: true }))
  await expect(page.getByRole('heading', { name: 'Business overview', level: 1 })).toBeVisible()
  await activate(page, page.getByRole('link', { name: /Rahul Sharma Keyboard journey/ }))
  await expect(page.getByRole('heading', { name: 'Keyboard journey' })).toBeVisible()
  await activate(page, page.getByRole('button', { name: 'Approve request' }))
  await activate(page, confirm(page, 'Approve request'))
  await expect(page.getByText('Request approved', { exact: true }).first()).toBeVisible()
  await activate(page, page.getByRole('button', { name: 'Record repayment' }))
  await enter(page, page.getByLabel('Repayment amount (₹)'), '200.25')
  await activate(page, confirm(page, 'Review repayment'))
  await activate(page, confirm(page, 'Confirm repayment'))
  await expect(page.getByRole('dialog').getByText('₹300.25', { exact: true })).toBeVisible()
  await activate(page, confirm(page, 'Done'))
  const detail = page.url()
  await page.reload()
  await expect(page.locator('.detail-balance')).toContainText('₹300.25')
  const customerTab = await page.context().newPage()
  await customerTab.goto(detail + '?view=customer')
  await expect(customerTab.getByRole('button', { name: 'Simulate repayment' })).toBeVisible()
  await activate(page, page.getByRole('button', { name: 'Settle balance' }))
  await activate(page, confirm(page, 'Confirm repayment'))
  await expect(page.getByRole('dialog').getByText('Demo credit settled')).toBeVisible()
  await activate(page, confirm(page, 'Done'))
  await expect(customerTab.locator('.detail-balance')).toContainText('₹0')
  await expect(customerTab.getByRole('button', { name: 'Simulate repayment' })).toHaveCount(0)
  await customerTab.close()
  await activate(page, page.getByRole('link', { name: 'Merchant', exact: true }))
  await expect(page.getByText('₹48,650', { exact: true })).toBeVisible()
  await activate(page, page.getByRole('link', { name: 'PopAI LOCAL' }))
  await activate(page, page.getByRole('button', { name: 'How much is outstanding?' }))
  await expect(page.getByRole('log')).toContainText('₹48,650')
  await activate(page, page.getByRole('link', { name: 'Reports', exact: true }))
  const csv = page.waitForEvent('download')
  await activate(page, page.getByRole('button', { name: 'Download CSV' }))
  expect(await readFile((await (await csv).path())!, 'utf8')).toContain('Fictional PopPay demo data')
  await activate(page, page.getByRole('button', { name: 'Reset Demo' }))
  await activate(page, confirm(page, 'Reset demo data'))
  await expect(page.getByRole('heading', { name: 'Business overview', level: 1 })).toBeVisible()
  await expect(page.getByText('₹48,650', { exact: true })).toBeVisible()
  await page.goto(detail)
  await expect(page.getByRole('heading', { name: 'Record not found' })).toBeVisible()
  expect(errors).toEqual([])
})

test('customer can request credit and make a simulated repayment in the same ledger', async ({ page }) => {
  await page.goto('/customer')
  await page.getByRole('button', { name: 'Request credit' }).click()
  await expect(page.getByLabel('Customer', { exact: true })).toBeDisabled()
  await page.getByLabel('Amount (₹)', { exact: false }).fill('60')
  await page.getByLabel('Description').fill('Customer request')
  await confirm(page, 'Preview PopCard').click()
  await confirm(page, 'Generate PopCard').click()
  await page.getByRole('link', { name: 'View credit record' }).click()
  await expect(page.getByRole('button', { name: 'Approve request' })).toHaveCount(0)
  await page.goto('/credit/kirana-open-1?view=customer')
  await page.getByRole('button', { name: 'Simulate repayment' }).click()
  await page.getByLabel('Repayment amount (₹)').fill('50')
  await confirm(page, 'Review repayment').click()
  await confirm(page, 'Confirm repayment').click()
  await expect(page.getByRole('dialog').getByText('Demo repayment recorded')).toBeVisible()
  await confirm(page, 'Done').click()
  await page.goto('/credit/kirana-open-1')
  await expect(page.locator('.detail-balance')).toContainText('₹4,100')
})

test('merchant isolation, assistant confirmation, collections and exports', async ({ page }) => {
  await page.goto('/assistant')
  const action = page.getByRole('button', { name: 'Record a ₹200 repayment for Rahul Sharma' })
  await action.click()
  await expect(page.getByRole('log')).toContainText('Needs confirmation')
  const second = await page.context().newPage()
  await second.goto('/dashboard')
  await expect(second.getByText('₹48,650', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Confirm action' }).click()
  await expect(page.getByRole('log')).toContainText('Confirmed locally')
  await expect(second.getByText('₹48,450', { exact: true })).toBeVisible()
  await page.getByLabel('Demo business').selectOption('cafe')
  await expect(page.getByRole('heading', { name: 'PopAI', exact: true })).toBeVisible()
  await expect(page.getByRole('log')).not.toContainText('Confirmed locally')
  await page.getByRole('button', { name: 'How much is outstanding?' }).click()
  await expect(page.getByRole('log')).toContainText('₹31,622.50')
  await page.goto('/collections')
  await page.getByRole('button', { name: 'Overdue', exact: true }).click()
  await expect(page.getByRole('table')).toContainText('Kabir Nair')
  await page.getByRole('button', { name: 'Edit template' }).click()
  await page.getByRole('dialog').getByRole('textbox').fill('Hello {name}. Demo balance: {balance}.')
  await confirm(page, 'Save template').click()
  await expect(page.getByLabel('Draft preview')).toHaveValue(/Hello Aarav Mehta/)
  await page.getByRole('button', { name: 'Save draft' }).click()
  await expect(page.getByText('Saved draft', { exact: true })).toBeVisible()
  await page.getByLabel('Add a follow-up note').fill('Check the balance on Friday')
  await page.getByRole('button', { name: 'Save note' }).click()
  await expect(page.getByText('Check the balance on Friday', { exact: true })).toBeVisible()
  await page.goto('/reports?customer=cafe-c1')
  const report = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Download JSON' }).click()
  const json = JSON.parse(await readFile((await (await report).path())!, 'utf8'))
  expect(json).toMatchObject({ title: 'Customer statement', merchant: 'Urban Brew Café' })
  expect(json.rows[0]).toContain('Aarav Mehta')
  await page.emulateMedia({ media: 'print' })
  await expect(page.getByRole('button', { name: 'Print / save PDF' })).toBeHidden()
  await expect(page.getByText(json.disclaimer)).toBeVisible()
})

test('direct routes, light theme and supported widths keep controls on screen', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 })
  await page.goto('/')
  await page.getByRole('button', { name: 'Switch to light theme' }).click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
  await page.getByRole('link', { name: 'Explore Interactive Demo' }).click()
  await page.getByRole('button', { name: 'Open navigation' }).click()
  await expect(page.getByRole('dialog').getByRole('link', { name: 'Credit ledger' })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toHaveCount(0)
  for (const width of [360, 390, 768, 1024, 1440, 1920]) {
    await page.setViewportSize({ width, height: 900 })
    for (const route of ['/', '/dashboard', '/customer']) {
      await page.goto(route)
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width)
    }
  }
  for (const [path, name] of [
    ['/customers/kirana-c1', 'Rahul Sharma'],
    ['/credit/kirana-pending-1', 'Monthly groceries'],
    ['/collections', 'Collections'],
    ['/reports', 'Reports'],
    ['/assistant', 'PopAI'],
    ['/story', 'From a handwritten tab to a digital ledger.'],
  ]) {
    const result = await page.goto(path)
    expect(result?.status()).toBe(200)
    await expect(page.getByRole('heading', { name, exact: true })).toBeVisible()
  }
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
})

test('offline direct navigation and mutations work after asset caching', async ({ page, context }) => {
  await page.goto('/')
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null)
  await context.setOffline(true)
  await page.goto('/dashboard')
  await expect(page.getByText('₹48,650', { exact: true })).toBeVisible()
  await page.goto('/credit/kirana-open-1')
  await page.getByRole('button', { name: 'Settle balance' }).click()
  await confirm(page, 'Confirm repayment').click()
  await expect(page.getByRole('dialog').getByText('Demo credit settled')).toBeVisible()
  await page.goto('/dashboard')
  await expect(page.getByText('₹44,500', { exact: true })).toBeVisible()
})

test('temporary browser storage is disclosed and does not survive reload', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'indexedDB', {
      get() {
        return undefined
      },
    })
  })
  await page.goto('/credit/kirana-open-1')
  await expect(page.getByText(/Temporary demo:/)).toBeVisible()
  await page.getByRole('button', { name: 'Settle balance' }).click()
  await confirm(page, 'Confirm repayment').click()
  await expect(page.getByRole('dialog').getByText('Demo credit settled')).toBeVisible()
  await page.reload()
  await expect(page.locator('.detail-balance')).toContainText('₹4,150')
})

test('automated WCAG checks cover both themes, customer view and a modal', async ({ page }) => {
  for (const [route, heading] of [
    ['/', 'Udhaar, without the uncertainty.'],
    ['/dashboard', 'Business overview'],
    ['/customer', 'Hi, Rahul.'],
  ]) {
    await page.goto(route)
    await expect(page.getByRole('heading', { name: heading, exact: true })).toBeVisible()
    const audit = () =>
      new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze()
    const dark = await audit()
    expect(dark.violations.map((v) => ({ rule: v.id, nodes: v.nodes.map((n) => n.target) }))).toEqual([])
    await page.getByRole('button', { name: 'Switch to light theme' }).click()
    const light = await audit()
    expect(light.violations.map((v) => ({ rule: v.id, nodes: v.nodes.map((n) => n.target) }))).toEqual([])
    await page.getByRole('button', { name: 'Switch to dark theme' }).click()
  }
  await page.getByRole('button', { name: 'Request credit' }).click()
  expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()).violations).toEqual([])
})
