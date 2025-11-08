import { test, expect } from '@playwright/test';

// End-to-End Testing - Full user workflows
test.describe('Authentication Flow', () => {
  const testUser = {
    email: `e2e-test-${Date.now()}@example.com`,
    password: 'SecurePassword123!',
    name: 'E2E Test User'
  };

  test('complete user registration and login flow', async ({ page }) => {
    // Navigate to registration page
    await page.goto('/register');
    
    // Fill registration form
    await page.fill('[data-testid="email-input"]', testUser.email);
    await page.fill('[data-testid="password-input"]', testUser.password);
    await page.fill('[data-testid="name-input"]', testUser.name);
    
    // Submit registration
    await page.click('[data-testid="register-button"]');
    
    // Should redirect to dashboard or show success message
    await expect(page).toHaveURL(/\/dashboard|\/login/);
    
    // If redirected to login, perform login
    if (page.url().includes('/login')) {
      await page.fill('[data-testid="email-input"]', testUser.email);
      await page.fill('[data-testid="password-input"]', testUser.password);
      await page.click('[data-testid="login-button"]');
    }
    
    // Should be on dashboard
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.locator('[data-testid="user-name"]')).toContainText(testUser.name);
  });

  test('should show validation errors for invalid registration', async ({ page }) => {
    await page.goto('/register');
    
    // Try to submit with invalid data
    await page.fill('[data-testid="email-input"]', 'invalid-email');
    await page.fill('[data-testid="password-input"]', '123'); // Weak password
    await page.click('[data-testid="register-button"]');
    
    // Should show validation errors
    await expect(page.locator('[data-testid="email-error"]')).toBeVisible();
    await expect(page.locator('[data-testid="password-error"]')).toBeVisible();
  });

  test('should handle login with wrong credentials', async ({ page }) => {
    await page.goto('/login');
    
    await page.fill('[data-testid="email-input"]', 'nonexistent@example.com');
    await page.fill('[data-testid="password-input"]', 'wrongpassword');
    await page.click('[data-testid="login-button"]');
    
    // Should show error message
    await expect(page.locator('[data-testid="login-error"]')).toBeVisible();
    await expect(page.locator('[data-testid="login-error"]')).toContainText('Invalid credentials');
  });

  test('should logout successfully', async ({ page }) => {
    // First login
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', testUser.email);
    await page.fill('[data-testid="password-input"]', testUser.password);
    await page.click('[data-testid="login-button"]');
    
    await expect(page).toHaveURL(/\/dashboard/);
    
    // Then logout
    await page.click('[data-testid="user-menu"]');
    await page.click('[data-testid="logout-button"]');
    
    // Should redirect to login page
    await expect(page).toHaveURL(/\/login/);
  });
});





































