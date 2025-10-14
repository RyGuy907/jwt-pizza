import type { Page } from '@playwright/test';
import { test, expect } from 'playwright-test-coverage';
import { User, Role } from '../src/service/pizzaService';
import {User1, registerMockAPI, updateUserMockAPI, 
  logout, login, adminFranchiseMockApi, listUsersMockAPI, 
  listUsersFilterMockAPI, deleteUserMockAPI, deletedUserMockAPI} from './testUtils'

test('home page', async ({ page }) => {
  await page.goto('/');

  expect(await page.title()).toBe('JWT Pizza');
});



async function basicInit(page: Page) {
  let loggedInUser: User | undefined;
  const validUsers: Record<string, User> = { 'd@jwt.com': { id: '3', name: 'Kai Chen', email: 'd@jwt.com', password: 'a', roles: [{ role: Role.Diner }] } };

  // Authorize login for the given user
  await page.route('*/**/api/auth', async (route) => {
    const loginReq = route.request().postDataJSON();
    const user = validUsers[loginReq.email];
    if (!user || user.password !== loginReq.password) {
      await route.fulfill({ status: 401, json: { error: 'Unauthorized' } });
      return;
    }
    loggedInUser = validUsers[loginReq.email];
    const loginRes = {
      user: loggedInUser,
      token: 'abcdef',
    };
    expect(route.request().method()).toBe('PUT');
    await route.fulfill({ json: loginRes });
  });

  // Return the currently logged in user
  await page.route('*/**/api/user/me', async (route) => {
    expect(route.request().method()).toBe('GET');
    await route.fulfill({ json: loggedInUser });
  });

  // A standard menu
  await page.route('*/**/api/order/menu', async (route) => {
    const menuRes = [
      {
        id: 1,
        title: 'Veggie',
        image: 'pizza1.png',
        price: 0.0038,
        description: 'A garden of delight',
      },
      {
        id: 2,
        title: 'Pepperoni',
        image: 'pizza2.png',
        price: 0.0042,
        description: 'Spicy treat',
      },
    ];
    expect(route.request().method()).toBe('GET');
    await route.fulfill({ json: menuRes });
  });

  // Standard franchises and stores
  await page.route(/\/api\/franchise(\?.*)?$/, async (route) => {
    const franchiseRes = {
      franchises: [
        {
          id: 2,
          name: 'LotaPizza',
          stores: [
            { id: 4, name: 'Lehi' },
            { id: 5, name: 'Springville' },
            { id: 6, name: 'American Fork' },
          ],
        },
        { id: 3, name: 'PizzaCorp', stores: [{ id: 7, name: 'Spanish Fork' }] },
        { id: 4, name: 'topSpot', stores: [] },
      ],
    };
    expect(route.request().method()).toBe('GET');
    await route.fulfill({ json: franchiseRes });
  });

  // Order a pizza.
  await page.route('*/**/api/order', async (route) => {
    const orderReq = route.request().postDataJSON();
    const orderRes = {
      order: { ...orderReq, id: 23 },
      jwt: 'eyJpYXQ',
    };
    expect(route.request().method()).toBe('POST');
    await route.fulfill({ json: orderRes });
  });

  await page.goto('/');
}

test('login', async ({ page }) => {
  await basicInit(page);
  await page.getByRole('link', { name: 'Login' }).click();
  await page.getByRole('textbox', { name: 'Email address' }).fill('d@jwt.com');
  await page.getByRole('textbox', { name: 'Password' }).fill('a');
  await page.getByRole('button', { name: 'Login' }).click();

  await expect(page.getByRole('link', { name: 'KC' })).toBeVisible();
});

test('purchase with login', async ({ page }) => {
  await page.goto('/');
await page.waitForLoadState('networkidle');
  await basicInit(page);

  // Go to order page
  await page.getByRole('button', { name: 'Order now' }).click();

  // Create order
  await expect(page.locator('h2')).toContainText('Awesome is a click away');
  await page.getByRole('combobox').selectOption('4');
  await page.getByRole('link', { name: 'Image Description Veggie A' }).click();
  await page.getByRole('link', { name: 'Image Description Pepperoni' }).click();
  await expect(page.locator('form')).toContainText('Selected pizzas: 2');
  await page.getByRole('button', { name: 'Checkout' }).click();

  // Login
  await page.getByPlaceholder('Email address').click();
  await page.getByPlaceholder('Email address').fill('d@jwt.com');
  await page.getByPlaceholder('Email address').press('Tab');
  await page.getByPlaceholder('Password').fill('a');
  await page.getByRole('button', { name: 'Login' }).click();

  // Pay
  await expect(page.getByRole('main')).toContainText('Send me those 2 pizzas right now!');
  await expect(page.locator('tbody')).toContainText('Veggie');
  await expect(page.locator('tbody')).toContainText('Pepperoni');
  await expect(page.locator('tfoot')).toContainText('0.008 ₿');
  await page.getByRole('button', { name: 'Pay now' }).click();

  // Check balance
  await expect(page.getByText('0.008')).toBeVisible();
});

let sampleFranchise = {
  id: 7,
  name: 'Sample Store',
  admin: [{ id: '3', name: 'pizza franchisee', email: 'f@jwt.com' }],
  stores: [{ id: 1, name: 'Test', totalRevenue: 0 }],
};

async function supportAuthOverrides(
  page: Page,
  { handleDelete = false, handlePostRegister = false } = {}
) {
  await page.route('*/**/api/auth', async (route) => {
    const method = route.request().method();

    if (handleDelete && method === 'DELETE') {
      await route.fulfill({ status: 200, json: { message: 'logout successful' } });
      return;
    }

    if (handlePostRegister && method === 'POST') {
      const body = route.request().postDataJSON() ?? {};
      const { name, email, password } = body;
      if (!name || !email || !password) {
        await route.fulfill({ status: 400, json: { message: 'name, email, and password are required' } });
        return;
      }
      const newUser = { id: '4', name, email, password, roles: [{ role: 'diner' }] };
      await route.fulfill({ status: 200, json: { user: newUser, token: 'testToken' } });
      return;
    }
    await route.fallback();
  });
}

// logout
test('logout', async ({ page }) => {
  await basicInit(page);
  await page.getByRole('link', { name: 'Login' }).click();
  await page.getByRole('textbox', { name: 'Email address' }).fill('d@jwt.com');
  await page.getByRole('textbox', { name: 'Password' }).fill('a');
  await page.getByRole('button', { name: 'Login' }).click();
  await page.waitForLoadState('networkidle');
  await expect(page.getByRole('link', { name: 'KC' })).toBeVisible();
  await supportAuthOverrides(page, { handleDelete: true });

  await page.getByRole('link', { name: 'Logout' }).click();
  await expect(page.getByRole('link', { name: 'Register' })).toBeVisible();
});

// register
test('register', async ({ page }) => {
  await basicInit(page);
  await supportAuthOverrides(page, { handlePostRegister: true });
  await page.getByRole('link', { name: 'Register' }).click();
  await page.getByRole('textbox', { name: 'Full name' }).fill('user');
  await page.getByRole('textbox', { name: 'Email address' }).fill('user@jwt.com');
  await page.getByRole('textbox', { name: 'Password' }).fill('secret-pass');
  await page.getByRole('button', { name: 'Register' }).click();
  await expect(page.getByRole('link', { name: 'Logout' })).toBeVisible();
});

// create and close franchise
test('create and close franchise', async ({ page }) => {
  test.setTimeout(500000);
  await basicInit(page);
  await page.route('*/**/api/auth', async (route) => {
    if (route.request().method() === 'PUT') {
      const body = route.request().postDataJSON() ?? {};
      if (body.email === 'a@jwt.com' && body.password === 'admin') {
        await route.fulfill({
          json: {
            user: { id: '1', name: '常用名字', email: 'a@jwt.com', roles: [{ role: 'admin' }] },
            token: 'adminToken',
          },
        });
        return;
      }
    }
    await route.fallback();
  });
  {
    let created = false;
    await page.route(/\/api\/franchise(\?.*)?$/, async (route) => {
      const method = route.request().method();

      if (method === 'POST') {
        created = true;
        await route.fulfill({
          json: {
            franchises: [
              {
                id: 2,
                name: 'Sample Franchise A',
                stores: [
                  { id: 4, name: 'Location One' },
                  { id: 5, name: 'Location Two' },
                  { id: 6, name: 'Location Three' },
                ],
              },
              { id: 3, name: 'Sample Franchise B', stores: [{ id: 7, name: 'Location Four' }] },
              { id: 4, name: 'Sample Franchise C', stores: [] },
              { id: 7, name: 'Sample Store', admin: [{ id: '3', name: 'pizza franchisee', email: 'f@jwt.com' }], stores: [] },
            ],
          },
        });
        return;
      }

      if (method === 'GET') {
        const base = [
          {
            id: 2,
            name: 'Sample Franchise A',
            stores: [
              { id: 4, name: 'Location One' },
              { id: 5, name: 'Location Two' },
              { id: 6, name: 'Location Three' },
            ],
          },
          { id: 3, name: 'Sample Franchise B', stores: [{ id: 7, name: 'Location Four' }] },
          { id: 4, name: 'Sample Franchise C', stores: [] },
        ];
        const withNew = [
          ...base,
          { id: 7, name: 'Sample Store', admin: [{ id: '3', name: 'pizza franchisee', email: 'f@jwt.com' }], stores: [] },
        ];
        await route.fulfill({ json: { franchises: created ? withNew : base } });
        return;
      }

      if (method === 'DELETE') {
        created = false;
        await route.fulfill({ json: { message: 'deleted' } });
        return;
      }

      await route.fallback();
    });
  }
  await page.getByRole('link', { name: 'Login' }).click();
  await page.getByRole('textbox', { name: 'Email address' }).fill('a@jwt.com');
  await page.getByRole('textbox', { name: 'Password' }).fill('admin');
  await page.getByRole('button', { name: /login/i }).click();
  await page.waitForLoadState('networkidle');

  const adminEntry =
    (await page.getByRole('link', { name: /admin/i }).elementHandle({ timeout: 15000 })) ??
    (await page.getByRole('button', { name: /admin/i }).elementHandle({ timeout: 15000 }));
  expect(adminEntry).toBeTruthy();
  await (adminEntry as any).click();

  await page.getByRole('button', { name: /add franchise/i }).click();
  await page.getByRole('textbox', { name: /franchise name/i }).fill('Sample Store');
  await page.getByRole('textbox', { name: /franchisee admin email/i }).fill('user@jwt.com');
  await page.getByRole('button', { name: /create/i }).click();
  await expect(
    page.getByRole('cell', { name: /sample store/i }).or(
      page.getByRole('gridcell', { name: /sample store/i })
    )
  ).toBeVisible({ timeout: 15000 });
  await page.getByRole('row', { name: /sample store/i }).getByRole('button').click();
  await expect(page.getByText(/sorry to see you go/i)).toBeVisible();
  await page.getByRole('button', { name: /close/i }).click();
});

// create store and then close store
test('create store and close store', async ({ page }) => {
  await page.route('*/**/api/auth', async (route) => {
    if (route.request().method() === 'PUT') {
      const loginReq = { email: 'f@jwt.com', password: 'secret-pass' };
      expect(route.request().postDataJSON()).toMatchObject(loginReq);
      const loginRes = {
        user: { id: 3, name: 'pizza franchisee', email: 'f@jwt.com', roles: [{ objectId: 7, role: 'franchisee' }] },
        token: 'token',
      };
      await route.fulfill({ json: loginRes });
      return;
    }
    await route.fallback();
  });

  await page.route('*/**/api/franchise/3', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({ json: [sampleFranchise] });
      return;
    }
    await route.fallback();
  });

  await page.route('*/**/api/franchise/7/store', async (route) => {
    if (route.request().method() === 'POST') {
      sampleFranchise.stores.push({ id: 1, name: 'The Best', totalRevenue: 0 });
      await route.fulfill({ json: sampleFranchise });
      return;
    }
    await route.fallback();
  });

  await page.route('*/**/api/franchise/7/store/1', async (route) => {
    if (route.request().method() === 'DELETE') {
      sampleFranchise.stores = sampleFranchise.stores.filter((s) => s.id !== 1);
      await route.fulfill({ json: { message: 'store deleted' } });
      return;
    }
    await route.fallback();
  });
  await page.goto('/');
  await page.getByRole('link', { name: 'Login' }).click();
  await page.getByRole('textbox', { name: 'Email address' }).fill('f@jwt.com');
  await page.getByRole('textbox', { name: 'Password' }).fill('secret-pass');
  await page.getByRole('button', { name: 'Login' }).click();
  await page.waitForLoadState('networkidle');
  await expect(page.getByRole('link', { name: 'Logout' })).toBeVisible();
  await page.getByLabel('Global').getByRole('link', { name: 'Franchise' }).click();

  await expect(page.getByRole('link', { name: 'franchise-dashboard' })).toBeVisible();
  await expect(page.getByRole('heading')).toContainText('Sample Store');

  await page.getByRole('button', { name: 'Create store' }).click();
  await page.getByRole('textbox', { name: 'store name' }).fill('The Best');
  await page.getByRole('button', { name: 'Create' }).click();
  await expect(page.getByRole('cell', { name: 'The Best' })).toBeVisible();

  await page.getByRole('row', { name: 'The Best 0 ₿ Close' }).getByRole('button').click();
  await expect(page.getByText(/are you sure you want to/i)).toBeVisible();
  await page.getByRole('button', { name: 'Close' }).click();
});

test('visit about and history pages', async ({ page }) => {
await page.goto('/');
await page.getByText('Pizza is a universal language').click();
await page.getByText('Pizza is an absolute delight').click();
await page.locator('html').click();
await page.getByRole('contentinfo').getByRole('link', { name: 'Franchise' }).click();
await page.getByRole('link', { name: 'About' }).click();
await page.getByRole('link', { name: 'History' }).click();
});

test('updateUser', async ({ page }) => {
  const email = `user${Math.floor(Math.random() * 10000)}@jwt.com`;
  const initialUser = new User1(email, 'diner', 'pizza diner', 3);
  await registerMockAPI(page, initialUser);
  await page.goto('/');
  await page.getByRole('link', { name: 'Register' }).click();
  await page.getByRole('textbox', { name: 'Full name' }).fill(initialUser.name);
  await page.getByRole('textbox', { name: 'Email address' }).fill(initialUser.email);
  await page.getByRole('textbox', { name: 'Password' }).fill(initialUser.password);
  await page.getByRole('button', { name: 'Register' }).click();
  await page.getByRole('link', { name: 'pd' }).click();
  await expect(page.getByRole('main')).toContainText('pizza diner');
  await updateUserMockAPI(page, initialUser);
  await page.getByRole('button', { name: 'Edit' }).click();
  await expect(page.locator('h3')).toContainText('Edit user');
  await page.getByRole('button', { name: 'Update' }).click();
  await page.waitForSelector('[role="dialog"].hidden', { state: 'attached' });
  await expect(page.getByRole('main')).toContainText('pizza diner');
  const updatedUser = new User1(email, 'diner', 'pizza dinerx', 3);
  await page.unroute('*/**/api/user/**');
  await updateUserMockAPI(page, updatedUser);
  await page.getByRole('button', { name: 'Edit' }).click();
  await expect(page.locator('h3')).toContainText('Edit user');
  await page.getByRole('textbox').first().fill('pizza dinerx');
  await page.getByRole('button', { name: 'Update' }).click();
  await page.waitForSelector('[role="dialog"].hidden', { state: 'attached' });
  await expect(page.getByRole('main')).toContainText('pizza dinerx');
  await page.unroute('*/**/api/auth');
  await logout(page);
  await page.getByRole('link', { name: 'Logout' }).click();
  await page.unroute('*/**/api/auth');
  await login(page, updatedUser, 'diner');
  await page.getByRole('link', { name: 'Login' }).click();
  await page.getByRole('textbox', { name: 'Email address' }).fill(email);
  await page.getByRole('textbox', { name: 'Password' }).fill('diner');
  await page.getByRole('button', { name: 'Login' }).click();
  await page.getByRole('link', { name: 'pd' }).click();
  await expect(page.getByRole('main')).toContainText('pizza dinerx');
});

test('adminDashboard 1', async ({ page }) => {
  await page.goto('/');
  const adminUser = new User1('admin@jwt.com', 'admin', 'Admin User', 1);
  await login(page, adminUser, 'admin');
  await page.getByRole('link', { name: 'Login' }).click();
  await page.getByRole('textbox', { name: 'Email address' }).fill(adminUser.email);
  await page.getByRole('textbox', { name: 'Password' }).fill(adminUser.password);
  await page.getByRole('button', { name: 'Login' }).click();
  await listUsersMockAPI(page);
  await adminFranchiseMockApi(page);
  await page.getByRole('link', { name: 'ad' }).click();
await page.waitForLoadState('networkidle');
await expect(
  page.getByRole('heading', { name: /Mama Ricci's kitchen|SliceWorks/i })
).toBeVisible();
  await expect(page.getByRole('main')).toContainText('Users');
  await expect(page.getByRole('columnheader', { name: 'Name' })).toBeVisible();
  await expect(page.getByRole('columnheader', { name: 'Email' })).toBeVisible();
  await expect(page.getByRole('columnheader', { name: 'Role' })).toBeVisible();
  await expect(page.getByRole('cell', { name: '常用名字' })).toBeVisible();
  await expect(page.getByRole('cell', { name: 'a@jwt.com' })).toBeVisible();
  await expect(page.getByRole('cell', { name: 'Admin' }).first()).toBeVisible();
});

test('adminDahsboard 2', async ({ page }) => {
  await page.goto('/');
  const adminUser = new User1('admin@jwt.com', 'admin', 'Admin User', 1);
  await login(page, adminUser, 'admin');
  await page.getByRole('link', { name: 'Login' }).click();
  await page.getByRole('textbox', { name: 'Email address' }).fill(adminUser.email);
  await page.getByRole('textbox', { name: 'Password' }).fill(adminUser.password);
  await page.getByRole('button', { name: 'Login' }).click();
  await listUsersMockAPI(page, true);
  await adminFranchiseMockApi(page);
  await page.getByRole('link', { name: 'ad' }).click();
await page.waitForLoadState('networkidle');
await expect(
  page.getByRole('heading', { name: /Mama Ricci's kitchen|SliceWorks/i })
).toBeVisible();
  await expect(page.getByRole('button', { name: 'Prev' })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Next' })).toBeEnabled();
  await page.getByRole('button', { name: 'Next' }).click();
  await expect(page.getByRole('button', { name: 'Prev' })).toBeEnabled();
  await page.getByRole('button', { name: 'Prev' }).click();
  await expect(page.getByRole('button', { name: 'Prev' })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Next' })).toBeEnabled();
});

test('delete user', async ({ page }) => {
  await page.goto('/');
  const adminUser = new User1('a@jwt.com', 'admin', 'Admin User', 1);
  await login(page, adminUser, 'admin');
  await page.getByRole('link', { name: 'Login' }).click();
  await page.getByRole('textbox', { name: 'Email address' }).fill(adminUser.email);
  await page.getByRole('textbox', { name: 'Password' }).fill(adminUser.password);
  await page.getByRole('button', { name: 'Login' }).click();
  await listUsersMockAPI(page);
  await adminFranchiseMockApi(page);
  await page.getByRole('link', { name: 'ad' }).click();
await page.waitForLoadState('networkidle');
await expect(
  page.getByRole('heading', { name: /Mama Ricci's kitchen|SliceWorks/i })
).toBeVisible();
  await page.unroute('*/**/api/user**');
  await deletedUserMockAPI(page);
  await deleteUserMockAPI(page, 2);
  const row = page.getByRole('row', { name: 'pizza diner d@jwt.com' });
  await expect(row.getByRole('button')).toBeVisible();
  await row.getByRole('button').click();
  await expect(page.getByText('Are you sure you want to')).toBeVisible();
  await page.getByRole('button', { name: 'Delete' }).click();
  await expect(row).not.toBeVisible();
});
