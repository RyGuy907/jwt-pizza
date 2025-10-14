import { expect } from "playwright-test-coverage";
import type { Page, Route, Request } from "@playwright/test";

export class User1 {
  email: string;
  password: string;
  name: string;
  id: number;
  constructor(email: string, password: string, name: string, id: number) {
    this.email = email;
    this.password = password;
    this.name = name;
    this.id = id;
  }
}

type HttpVerb = "GET" | "PUT" | "POST" | "DELETE";

const assertMethod = (rte: Route, verb: HttpVerb) => expect(rte.request().method()).toBe(verb);
const getJsonBody = (req: Request) => req.postDataJSON();
const fulfillJson = (rte: Route, body: unknown) => rte.fulfill({ json: body });

const STATIC_TOKEN = "abcdef";
const STATIC_JWT_PREFIX = "eyJpYXQ";

async function registerMockAPI(page: Page, subject: User1) {
  await page.route("*/**/api/auth", async (rte: Route) => {
    const expectedReq = { email: subject.email, password: subject.password, name: subject.name };
    const responseBody = {
      user: { name: subject.name, email: subject.email, roles: [{ role: "diner" }], id: subject.id },
      token: STATIC_TOKEN,
    };
    assertMethod(rte, "POST");
    expect(getJsonBody(rte.request())).toMatchObject(expectedReq);
    await fulfillJson(rte, responseBody);
  });
}

async function updateUserMockAPI(page: Page, subject: User1) {
  await page.route(`*/**/api/user/${subject.id}`, async (rte: Route) => {
    const expectedReq = { name: subject.name, email: subject.email };
    const responseBody = {
      user: { id: subject.id, name: subject.name, email: subject.email, roles: [{ role: "diner" }] },
      token: STATIC_TOKEN,
    };
    assertMethod(rte, "PUT");
    expect(getJsonBody(rte.request())).toMatchObject(expectedReq);
    await fulfillJson(rte, responseBody);
  });
}

async function login(page: Page, subject: User1, role: string) {
  await page.route("*/**/api/auth", async (rte: Route) => {
    const expectedReq = { email: subject.email, password: subject.password };
    const responseBody = {
      user: { id: subject.id, name: subject.name, email: subject.email, roles: [{ role }] },
      token: STATIC_TOKEN,
    };
    assertMethod(rte, "PUT");
    expect(getJsonBody(rte.request())).toMatchObject(expectedReq);
    await fulfillJson(rte, responseBody);
  });
}

async function franchiseeLogin(page: Page, subject: User1) {
  await page.route("*/**/api/auth", async (rte: Route) => {
    const expectedReq = { email: subject.email, password: subject.password };
    const responseBody = {
      user: { id: subject.id, name: subject.name, email: subject.email, roles: [{ role: "diner" }, { objectId: 1, role: "franchisee" }] },
      token: STATIC_TOKEN,
    };
    assertMethod(rte, "PUT");
    expect(getJsonBody(rte.request())).toMatchObject(expectedReq);
    await fulfillJson(rte, responseBody);
  });
}

async function logout(page: Page) {
  await page.route("*/**/api/auth", async (rte: Route) => {
    const responseBody = { message: "logout successful" };
    assertMethod(rte, "DELETE");
    await fulfillJson(rte, responseBody);
  });
}

async function listUsersMockAPI(page: Page, more: boolean = false) {
  await page.route("*/**/api/user?page=1&limit=10&name=*", async (rte: Route) => {
    const responseBody = {
      users: [
        { id: 1, name: "常用名字", email: "a@jwt.com", roles: [{ role: "admin" }] },
        { id: 2, name: "pizza diner", email: "d@jwt.com", roles: [{ role: "diner" }] },
        {
          id: 3,
          name: "pizza franchisee",
          email: "f@jwt.com",
          roles: [{ role: "diner" }, { role: "franchisee" }],
        },
      ],
      more,
    };
    expect(rte.request().method()).toBe("GET");
    await rte.fulfill({ json: responseBody });
  });
}


async function listUsersFilterMockAPI(page: Page, more: boolean = false) {
  await page.route("*/**/api/user?page=1&limit=10&name=s*sam%20roberts*", async (rte: Route) => {
    const responseBody = {
      users: [{ id: 9125, name: "sam roberts", email: "sam.roberts@jwt.com", roles: [{ role: "diner" }, { role: "franchisee" }] }],
      more,
    };
    assertMethod(rte, "GET");
    await fulfillJson(rte, responseBody);
  });
}

async function deleteUserMockAPI(page: Page, userId: number) {
  await page.route(`*/**/api/user/${userId}`, async (rte: Route) => {
    assertMethod(rte, "DELETE");
    await fulfillJson(rte, { message: "User deleted" });
  });
}

async function deletedUserMockAPI(page: Page, more: boolean = false) {
  await page.route("*/**/api/user?page=1&limit=10&name=*", async (rte: Route) => {
    const responseBody = {
      users: [
        { id: 1, name: "常用名字", email: "a@jwt.com", roles: [{ role: "admin" }] },
        {
          id: 3,
          name: "pizza franchisee",
          email: "f@jwt.com",
          roles: [{ role: "diner" }, { role: "franchisee" }],
        },
      ],
      more,
    };
    expect(rte.request().method()).toBe("GET");
    await rte.fulfill({ json: responseBody });
  });
}


async function franchiseePageMockApi(page: Page) {
  await page.route("*/**/api/franchise/3", async (rte: Route) => {
    const responseBody = [
      { id: 1, name: "SliceWorks", admins: [{ id: 3, name: "Riley Quinn", email: "riley.q@jwt.com" }], stores: [{ id: 1, name: "Downtown SLC", totalRevenue: 4.2079 }] },
    ];
    assertMethod(rte, "GET");
    await fulfillJson(rte, responseBody);
  });
}

async function franchiseePageNewStoreMockApi(page: Page) {
  await page.route("*/**/api/franchise/3", async (rte: Route) => {
    const responseBody = [
      { id: 1, name: "SliceWorks", admins: [{ id: 3, name: "Riley Quinn", email: "riley.q@jwt.com" }], stores: [{ id: 1, name: "Downtown SLC", totalRevenue: 4.3121 }, { id: 2, name: "Foothill Drive", totalRevenue: 0 }] },
    ];
    assertMethod(rte, "GET");
    await fulfillJson(rte, responseBody);
  });
}

async function menuMockApi(page: Page) {
  await page.route("*/**/api/order/menu", async (rte: Route) => {
    const responseBody = [
      { id: 1, title: "Margherita", image: "pie_classic.png", price: 0.0036, description: "Tomato, mozzarella, basil — clean and bright." },
      { id: 2, title: "Smoky Pepperoni", image: "pie_spicy.png", price: 0.0044, description: "Pepperoni with a hint of smoke and a crisp edge." },
    ];
    assertMethod(rte, "GET");
    await fulfillJson(rte, responseBody);
  });
}

async function checkoutMockApi(page: Page) {
  await page.route("*/**/api/user/*", async (rte: Route) => {
    const responseBody = { id: 9, name: "checkoutUser", email: "checkout@sample.test", roles: [], iat: 1759435763 };
    assertMethod(rte, "GET");
    await fulfillJson(rte, responseBody);
  });
}

async function payMockApi(page: Page) {
  await page.route("*/**/api/order", async (rte: Route) => {
    const incomingOrder = getJsonBody(rte.request());
    const responseBody = { order: { ...incomingOrder, id: 23 }, jwt: STATIC_JWT_PREFIX };
    assertMethod(rte, "POST");
    await fulfillJson(rte, responseBody);
  });
}

async function createStoreMockApi(page: Page) {
  await page.route("*/**/api/franchise/1/store", async (rte: Route) => {
    const expectedReq = { id: "", name: "Foothill Drive" };
    const responseBody = { id: 2, franchiseId: 1, name: "Foothill Drive" };
    assertMethod(rte, "POST");
    expect(getJsonBody(rte.request())).toMatchObject(expectedReq);
    await fulfillJson(rte, responseBody);
  });
}

async function deleteStoreMockApi(page: Page) {
  await page.route("*/**/api/franchise/1/store/2", async (rte: Route) => {
    assertMethod(rte, "DELETE");
    await fulfillJson(rte, { message: "Store deleted" });
  });
}

async function adminFranchiseMockApi(page: Page) {
  await page.route("*/**/api/franchise?page=0&limit=3&name=*", async (rte: Route) => {
    const responseBody = {
      franchises: [{ id: 1, name: "SliceWorks", admins: [{ id: 3, name: "Riley Quinn", email: "riley.q@jwt.com" }], stores: [{ id: 1, name: "Downtown SLC", totalRevenue: 4.3121 }] }],
      more: false,
    };
    assertMethod(rte, "GET");
    await fulfillJson(rte, responseBody);
  });
}

async function adminNewFranchiseMockApi(page: Page) {
  await page.route("*/**/api/franchise?page=0&limit=3&name=*", async (rte: Route) => {
    const responseBody = {
      franchises: [
        { id: 1, name: "SliceWorks", admins: [{ id: 3, name: "Riley Quinn", email: "riley.q@jwt.com" }], stores: [{ id: 1, name: "Downtown SLC", totalRevenue: 4.3121 }] },
        { id: 2, name: "Crust & Co.", admins: [{ id: 1, name: "Admin Alpha", email: "admin.alpha@jwt.com" }], stores: [] },
      ],
      more: false,
    };
    assertMethod(rte, "GET");
    await fulfillJson(rte, responseBody);
  });
}

async function createFranchiseMockApi(page: Page) {
  await page.route("*/**/api/franchise", async (rte: Route) => {
    const responseBody = { stores: [], id: 2, name: "Crust & Co.", admins: [{ email: "admin.alpha@jwt.com", id: 1, name: "Admin Alpha" }] };
    assertMethod(rte, "POST");
    await fulfillJson(rte, responseBody);
  });
}

async function deleteFranchiseMockApi(page: Page) {
  await page.route("*/**/api/franchise/2", async (rte: Route) => {
    assertMethod(rte, "DELETE");
    await fulfillJson(rte, { message: "Franchise deleted" });
  });
}

async function dinerFranchiseMockApi(page: Page) {
  await page.route("*/**/api/franchise?page=0&limit=20&name=*", async (rte: Route) => {
    const responseBody = { franchises: [{ id: 1, name: "SliceWorks", stores: [{ id: 1, name: "Downtown SLC" }] }], more: false };
    assertMethod(rte, "GET");
    await fulfillJson(rte, responseBody);
  });
}

export {
  User1 as User,
  login,
  logout,
  franchiseeLogin,
  franchiseePageMockApi,
  menuMockApi,
  checkoutMockApi,
  payMockApi,
  createStoreMockApi,
  deleteStoreMockApi,
  franchiseePageNewStoreMockApi,
  adminFranchiseMockApi,
  createFranchiseMockApi,
  adminNewFranchiseMockApi,
  deleteFranchiseMockApi,
  dinerFranchiseMockApi,
  registerMockAPI,
  updateUserMockAPI,
  listUsersMockAPI,
  listUsersFilterMockAPI,
  deleteUserMockAPI,
  deletedUserMockAPI,
};