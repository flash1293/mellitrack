import { test, expect } from '@playwright/test'

test.describe('Mellitrack E2E', () => {
  test('login flow works', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('h1:has-text("Mellitrack")')).toBeVisible()
    await page.fill('input[type="text"]', 'default')
    await page.fill('input[type="password"]', 'CHANGEME')
    await page.click('button:has-text("Anmelden")')
    await expect(page.locator('h2:has-text("Dashboard")')).toBeVisible()
  })

  test('invalid password shows error', async ({ page }) => {
    await page.goto('/login')
    await page.fill('input[type="text"]', 'default')
    await page.fill('input[type="password"]', 'wrong')
    await page.getByRole('button', { name: 'Anmelden' }).click()
    await expect(page.locator('p.text-red-600')).toBeVisible()
    await expect(page.locator('p.text-red-600')).toHaveText('Invalid username or password')
  })

  test('register new user', async ({ page }) => {
    const username = `testuser-${Date.now()}`

    await page.goto('/login')
    await page.click('text=Registrieren')
    await expect(page.locator('h1:has-text("Mellitrack")')).toBeVisible()

    await page.fill('input[type="text"]', username)
    await page.fill('input[type="password"]', 'testpass')
    await page.locator('input[type="password"]').nth(1).fill('testpass')
    await page.click('button:has-text("Registrieren")')

    // Should redirect to dashboard
    await expect(page.locator('h2:has-text("Dashboard")')).toBeVisible()

    // User is logged in (dashboard visible confirms this)
  })

  test('dashboard shows category charts', async ({ page }) => {
    await page.goto('/')
    await page.fill('input[type="text"]', 'default')
    await page.fill('input[type="password"]', 'CHANGEME')
    await page.click('button:has-text("Anmelden")')
    await expect(page.locator('h2:has-text("Dashboard")')).toBeVisible()

    // Should show category sections with charts
    await expect(page.locator('text=Oberkörper')).toBeVisible()
    await expect(page.locator('text=Unterkörper')).toBeVisible()
    await expect(page.locator('text=Ganzkörper')).toBeVisible()

    // Each category should have weight and reps charts
    await expect(page.locator('text=Gewicht (kg)').first()).toBeVisible()
    await expect(page.locator('text=Wiederholungen').first()).toBeVisible()
  })

  test('create exercise with multiple categories and training by category', async ({ page }) => {
    const exerciseName = `Test-Übung-${Date.now()}`

    // Login
    await page.goto('/')
    await page.fill('input[type="text"]', 'default')
    await page.fill('input[type="password"]', 'CHANGEME')
    await page.click('button:has-text("Anmelden")')
    await expect(page.locator('h2:has-text("Dashboard")')).toBeVisible()

    // Navigate to exercises
    await page.click('nav >> visible=true >> text=Übungen')
    await expect(page.locator('text=Oberkörper')).toBeVisible()

    // Add new exercise (uses pre-selected Oberkörper category)
    await page.click('text=+ Übung')
    await page.fill('input[placeholder="Übungsname"]', exerciseName)
    await page.click('button:has-text("Hinzufügen")')

    // Should appear in the list
    await expect(page.locator(`text=${exerciseName}`).first()).toBeVisible()

    // Navigate to new training
    await page.click('nav >> visible=true >> text=Training')
    await page.click('text=Neues Training')
    await expect(page.locator('h2:has-text("Neues Training")')).toBeVisible()

    // Select a category - exercises auto-populate with all sets from last training
    await page.selectOption('select', { label: 'Oberkörper' })

    // Wait for Oberkörper exercises to load
    await expect(page.locator('text=Bankdrücken')).toBeVisible()

    // Should see our new exercise too
    await expect(page.locator(`text=${exerciseName}`)).toBeVisible()

    // New exercise that was never trained gets 1 set prefilled from last-set fallback
    const exerciseCard = page.locator('.bg-white').filter({ hasText: exerciseName })
    await expect(exerciseCard.locator('text=S1')).toBeVisible()

    // Existing exercises in the category should have multiple sets prefilled from last category training
    const existingCard = page.locator('.bg-white').filter({ hasText: 'Bankdrücken' })
    await expect(existingCard.locator('text=S1')).toBeVisible()
    await expect(existingCard.locator('text=S2')).toBeVisible()
    await expect(existingCard.locator('text=S3')).toBeVisible()

    // Modify a value
    const firstWeightInput = exerciseCard.locator('input[placeholder="kg"]').first()
    await firstWeightInput.fill('999')
    await expect(firstWeightInput).toHaveValue('999')

    // Add a set - should copy current values
    await exerciseCard.locator('button:has-text("+ Satz hinzufügen")').click()
    await expect(exerciseCard.locator('text=S2')).toBeVisible()
    await expect(exerciseCard.locator('input[placeholder="kg"]').nth(1)).toHaveValue('999')

    // Save training
    await page.click('button:has-text("Speichern")')

    // Should redirect to training list
    await expect(page.locator('h2:has-text("Trainings")')).toBeVisible()
  })

  test('edit training', async ({ page }) => {
    // Login
    await page.goto('/')
    await page.fill('input[type="text"]', 'default')
    await page.fill('input[type="password"]', 'CHANGEME')
    await page.click('button:has-text("Anmelden")')

    // Navigate to trainings
    await page.click('nav >> visible=true >> text=Training')
    await expect(page.locator('h2:has-text("Trainings")')).toBeVisible()

    // Click edit on the first training
    await page.locator('button[aria-label="Bearbeiten"]').first().click()
    await expect(page.locator('h2:has-text("Training bearbeiten")')).toBeVisible()

    // Change a weight value
    const firstWeightInput = page.locator('input[placeholder="kg"]').first()
    await firstWeightInput.fill('42')

    // Save
    await page.click('button:has-text("Speichern")')

    // Should redirect to training list
    await expect(page.locator('h2:has-text("Trainings")')).toBeVisible()
  })

  test('edit exercise name', async ({ page }) => {
    const originalName = `Edit-Test-${Date.now()}`
    const newName = `Renamed-${Date.now()}`

    // Login
    await page.goto('/')
    await page.fill('input[type="text"]', 'default')
    await page.fill('input[type="password"]', 'CHANGEME')
    await page.click('button:has-text("Anmelden")')

    // Navigate to exercises
    await page.click('nav >> visible=true >> text=Übungen')

    // Add new exercise (Oberkörper is pre-selected, just fill name and submit)
    await page.click('text=+ Übung')
    await page.fill('input[placeholder="Übungsname"]', originalName)
    await page.click('button:has-text("Hinzufügen")')

    // Find the exercise and click edit
    await page.getByRole('button', { name: originalName }).first().locator('xpath=..').locator('button[aria-label="Bearbeiten"]').click()

    // Change name - find the input that has the original value
    await page.locator(`input[value="${originalName}"]`).first().fill(newName)
    await page.locator(`input[value="${newName}"]`).first().locator('xpath=..').locator('button').first().click()

    // Should show new name
    await expect(page.getByRole('button', { name: newName }).first()).toBeVisible()
  })

  test('progress chart is accessible', async ({ page }) => {
    // Login
    await page.goto('/')
    await page.fill('input[type="text"]', 'default')
    await page.fill('input[type="password"]', 'CHANGEME')
    await page.click('button:has-text("Anmelden")')

    // Go to exercises and click on the first one
    await page.click('nav >> visible=true >> text=Übungen')
    await page.locator('button:has-text("Bankdrücken")').first().click()

    // Should show progress page
    await expect(page.locator('h2:has-text("Bankdrücken")')).toBeVisible()
  })

  test('reorder exercises within category does not throw 404', async ({ page }) => {
    // Login
    await page.goto('/')
    await page.fill('input[type="text"]', 'default')
    await page.fill('input[type="password"]', 'CHANGEME')
    await page.click('button:has-text("Anmelden")')

    // Navigate to exercises
    await page.click('nav >> visible=true >> text=Übungen')
    await expect(page.locator('h2:has-text("Übungen")')).toBeVisible()

    // There should be at least one category with exercises
    await expect(page.locator('text=Oberkörper')).toBeVisible()

    // Try to reorder the first exercise down (click the first ↓ button in Oberkörper section)
    const downButtons = page.locator('button[aria-label="Nach unten"]')
    const count = await downButtons.count()
    if (count > 0) {
      // Listen for API responses to check the reorder endpoint returns 200
      const reorderResponses: number[] = []
      page.on('response', (res) => {
        if (res.url().includes('/exercises/reorder')) {
          reorderResponses.push(res.status())
        }
      })

      await downButtons.first().click()
      // Wait a bit for the request to complete
      await page.waitForTimeout(1000)

      // Check the reorder response was 200, not 404
      expect(reorderResponses.length).toBeGreaterThan(0)
      reorderResponses.forEach((status) => expect(status).toBe(200))

      // Verify page is still showing exercises without error
      await expect(page.locator('text=Oberkörper')).toBeVisible()
    }
  })

  test('mobile navigation works', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/')
    await page.fill('input[type="text"]', 'default')
    await page.fill('input[type="password"]', 'CHANGEME')
    await page.click('button:has-text("Anmelden")')

    // Bottom nav should be visible
    await expect(page.locator('nav >> visible=true >> text=Dashboard')).toBeVisible()
    await page.click('nav >> visible=true >> text=Übungen')
    await expect(page.locator('text=Oberkörper')).toBeVisible()
  })
})
