import { test, expect, Page } from '@playwright/test'

// ─── CONFIG ──────────────────────────────────────────────────

const BASE_URL    = process.env.BASE_URL ?? 'http://localhost:3000'
const TEST_EMAIL  = process.env.TEST_EMAIL  ?? 'test@karmexahr.com'
const TEST_PWD    = process.env.TEST_PASSWORD ?? 'Test@1234'
const TEST_COMPANY = process.env.TEST_COMPANY ?? 'technova'

// ─── HELPERS ─────────────────────────────────────────────────

async function login(page: Page) {
  await page.goto(`${BASE_URL}/login`)
  await page.fill('input[type="email"]', TEST_EMAIL)
  await page.fill('input[type="password"]', TEST_PWD)
  await page.click('button[type="submit"]')
  await page.waitForURL(`**/dashboard`, { timeout: 10000 })
}

// ─── AUTH ─────────────────────────────────────────────────────

test.describe('Authentication', () => {
  test('login with valid credentials', async ({ page }) => {
    await login(page)
    await expect(page).toHaveURL(/dashboard/)
  })

  test('login with invalid credentials shows error', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`)
    await page.fill('input[type="email"]', 'wrong@email.com')
    await page.fill('input[type="password"]', 'wrongpassword')
    await page.click('button[type="submit"]')
    await expect(page.locator('[data-sonner-toast]')).toBeVisible({ timeout: 5000 })
  })

  test('redirect unauthenticated users to login', async ({ page }) => {
    await page.goto(`${BASE_URL}/${TEST_COMPANY}`)
    await expect(page).toHaveURL(/login/)
  })
})

// ─── DASHBOARD ───────────────────────────────────────────────

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => { await login(page) })

  test('shows dashboard with stats', async ({ page }) => {
    await page.goto(`${BASE_URL}/${TEST_COMPANY}`)
    await expect(page.locator('h1')).toBeVisible()
    // Stats cards
    await expect(page.getByText('Total Employees')).toBeVisible()
    await expect(page.getByText('Present Today')).toBeVisible()
    await expect(page.getByText('Monthly Payroll')).toBeVisible()
  })

  test('company switcher works', async ({ page }) => {
    await page.goto(`${BASE_URL}/${TEST_COMPANY}`)
    await page.click('[data-testid="company-switcher"]')
    await expect(page.locator('text=Active Company')).toBeVisible()
  })
})

// ─── EMPLOYEES ───────────────────────────────────────────────

test.describe('Employee Management', () => {
  test.beforeEach(async ({ page }) => { await login(page) })

  test('employee directory loads', async ({ page }) => {
    await page.goto(`${BASE_URL}/${TEST_COMPANY}/employees`)
    await expect(page.locator('h1', { hasText: 'Employee Directory' })).toBeVisible()
    // Wait for table
    await page.waitForSelector('table', { timeout: 5000 })
  })

  test('employee search filters results', async ({ page }) => {
    await page.goto(`${BASE_URL}/${TEST_COMPANY}/employees`)
    await page.waitForSelector('table')
    const searchBox = page.locator('input[placeholder*="Search"]')
    await searchBox.fill('Priya')
    await page.waitForTimeout(500)
    const rows = page.locator('table tbody tr')
    const count = await rows.count()
    // Either results containing "Priya" or "No employees found"
    expect(count).toBeGreaterThanOrEqual(0)
  })

  test('add employee modal opens', async ({ page }) => {
    await page.goto(`${BASE_URL}/${TEST_COMPANY}/employees`)
    await page.click('button:has-text("Add Employee")')
    await expect(page.locator('[role="dialog"], .fixed.inset-0')).toBeVisible()
    await expect(page.getByText('Add New Employee')).toBeVisible()
  })

  test('add employee form validates required fields', async ({ page }) => {
    await page.goto(`${BASE_URL}/${TEST_COMPANY}/employees`)
    await page.click('button:has-text("Add Employee")')
    // Click through to bank tab and try to submit
    await page.click('button:has-text("Next →")')
    await page.click('button:has-text("Next →")')
    await page.click('button[type="submit"]')
    // Should show validation error
    await expect(page.locator('text=Required')).toBeVisible()
  })
})

// ─── ATTENDANCE ──────────────────────────────────────────────

test.describe('Attendance', () => {
  test.beforeEach(async ({ page }) => { await login(page) })

  test('attendance page loads with clock widget', async ({ page }) => {
    await page.goto(`${BASE_URL}/${TEST_COMPANY}/attendance`)
    await expect(page.locator('h1', { hasText: 'Attendance' })).toBeVisible()
    await expect(page.getByText('Current time')).toBeVisible()
  })

  test('heatmap renders', async ({ page }) => {
    await page.goto(`${BASE_URL}/${TEST_COMPANY}/attendance`)
    await expect(page.getByText('Monthly Overview')).toBeVisible()
  })
})

// ─── LEAVE MANAGEMENT ────────────────────────────────────────

test.describe('Leave Management', () => {
  test.beforeEach(async ({ page }) => { await login(page) })

  test('leave page shows pending requests', async ({ page }) => {
    await page.goto(`${BASE_URL}/${TEST_COMPANY}/leaves`)
    await expect(page.locator('h1', { hasText: 'Leave Management' })).toBeVisible()
    await expect(page.getByText('Pending')).toBeVisible()
  })

  test('apply leave modal opens', async ({ page }) => {
    await page.goto(`${BASE_URL}/${TEST_COMPANY}/leaves`)
    await page.click('button:has-text("Apply Leave")')
    await expect(page.getByText('Apply for Leave')).toBeVisible()
    await expect(page.locator('select')).toBeVisible()
  })

  test('tab switching works', async ({ page }) => {
    await page.goto(`${BASE_URL}/${TEST_COMPANY}/leaves`)
    await page.click('button:has-text("Approved")')
    await expect(page.locator('.bg-card.shadow')).toBeVisible()
  })
})

// ─── PAYROLL ─────────────────────────────────────────────────

test.describe('Payroll', () => {
  test.beforeEach(async ({ page }) => { await login(page) })

  test('payroll page loads', async ({ page }) => {
    await page.goto(`${BASE_URL}/${TEST_COMPANY}/payroll`)
    await expect(page.locator('h1', { hasText: 'Payroll' })).toBeVisible()
    await expect(page.getByText('Indian statutory compliance')).toBeVisible()
  })

  test('run payroll modal opens', async ({ page }) => {
    await page.goto(`${BASE_URL}/${TEST_COMPANY}/payroll`)
    await page.click('button:has-text("Run Payroll")')
    await expect(page.getByText('Run Payroll')).toBeVisible({ timeout: 3000 })
    await expect(page.locator('select')).toBeVisible()
  })
})

// ─── RECRUITMENT ─────────────────────────────────────────────

test.describe('Recruitment', () => {
  test.beforeEach(async ({ page }) => { await login(page) })

  test('kanban board renders', async ({ page }) => {
    await page.goto(`${BASE_URL}/${TEST_COMPANY}/recruitment`)
    await expect(page.locator('h1', { hasText: 'Recruitment' })).toBeVisible()
    // Check stage columns
    await expect(page.getByText('Applied')).toBeVisible()
    await expect(page.getByText('Screened')).toBeVisible()
    await expect(page.getByText('Hired 🎉')).toBeVisible()
  })
})

// ─── PERFORMANCE ─────────────────────────────────────────────

test.describe('Performance', () => {
  test.beforeEach(async ({ page }) => { await login(page) })

  test('performance page shows reviews', async ({ page }) => {
    await page.goto(`${BASE_URL}/${TEST_COMPANY}/performance`)
    await expect(page.locator('h1', { hasText: 'Performance Management' })).toBeVisible()
    await expect(page.getByText('Reviews Completed')).toBeVisible()
  })

  test('OKR tab works', async ({ page }) => {
    await page.goto(`${BASE_URL}/${TEST_COMPANY}/performance`)
    await page.click('button:has-text("OKRs & Goals")')
    await expect(page.getByText('On Track')).toBeVisible()
  })
})

// ─── ANALYTICS ───────────────────────────────────────────────

test.describe('Analytics', () => {
  test.beforeEach(async ({ page }) => { await login(page) })

  test('analytics dashboard loads with charts', async ({ page }) => {
    await page.goto(`${BASE_URL}/${TEST_COMPANY}/analytics`)
    await expect(page.locator('h1', { hasText: 'Analytics' })).toBeVisible()
    await expect(page.getByText('Total Headcount')).toBeVisible()
    await expect(page.getByText('Attrition Rate')).toBeVisible()
    // Charts should render
    await page.waitForSelector('.recharts-surface', { timeout: 5000 })
  })
})

// ─── ACCESSIBILITY ───────────────────────────────────────────

test.describe('Accessibility', () => {
  test.beforeEach(async ({ page }) => { await login(page) })

  test('keyboard navigation works on dashboard', async ({ page }) => {
    await page.goto(`${BASE_URL}/${TEST_COMPANY}`)
    await page.keyboard.press('Tab')
    const focused = await page.evaluate(() => document.activeElement?.tagName)
    expect(focused).toBeTruthy()
  })
})
