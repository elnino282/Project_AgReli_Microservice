import process from 'node:process';

const baseUrl = process.env.DEMO_BASE_URL ?? 'http://127.0.0.1:3000';
const accounts = {
  admin: { identifier: process.env.DEMO_ADMIN_EMAIL ?? 'admin@acm.local', password: process.env.DEMO_ADMIN_PASSWORD ?? 'admin123' },
  farmer: { identifier: process.env.DEMO_FARMER_EMAIL ?? 'farmer@acm.local', password: process.env.DEMO_FARMER_PASSWORD ?? '12345678' },
  employee: { identifier: process.env.DEMO_EMPLOYEE_EMAIL ?? 'employee@acm.local', password: process.env.DEMO_EMPLOYEE_PASSWORD ?? '12345678' },
  buyer: { identifier: process.env.DEMO_BUYER_EMAIL ?? 'buyer@acm.local', password: process.env.DEMO_BUYER_PASSWORD ?? '12345678' },
};

const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

async function request(path, options = {}, attempts = 3) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(`${baseUrl}${path}`, options);
      const text = await response.text();
      if (!response.ok) {
        throw new Error(`${path} returned HTTP ${response.status}: ${text.slice(0, 180)}`);
      }
      const contentType = response.headers.get('content-type') ?? '';
      const json = text && contentType.includes('application/json') ? JSON.parse(text) : null;
      return { response, text, json };
    } catch (error) {
      lastError = error;
      if (attempt < attempts) await wait(500 * attempt);
    }
  }
  throw lastError;
}

async function login(name) {
  const account = accounts[name];
  const { json } = await request('/api/v1/auth/sign-in', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...account, rememberMe: false }),
  });
  const token = json?.result?.token;
  if (!token) throw new Error(`${name} login không trả token`);
  console.log(`${name.toUpperCase()}_LOGIN=OK role=${json.result.role}`);
  return token;
}

const authorized = (token) => ({ headers: { Authorization: `Bearer ${token}` } });

async function main() {
  const front = await request('/');
  if (!front.text.includes('/src/main.tsx')) throw new Error('Frontend root không phải Vite SPA hiện hành');
  console.log('FRONTEND=OK');

  const farmerToken = await login('farmer');
  const seasonsResponse = await request('/api/v1/seasons?size=20', authorized(farmerToken));
  const seasonPage = seasonsResponse.json?.result;
  const seasons = seasonPage?.items ?? seasonPage?.content ?? (Array.isArray(seasonPage) ? seasonPage : []);
  console.log(`FARMER_SEASONS=${seasons.length}`);
  const seasonId = seasons[0]?.id;
  if (!seasonId) throw new Error('Không có season seed để demo farmer workspace');

  const farmerPaths = [
    '/api/v1/dashboard/sustainability/overview?scope=farm',
    `/api/v1/seasons/${seasonId}/nutrient-inputs`,
    `/api/v1/seasons/${seasonId}/irrigation-water-analyses`,
    `/api/v1/seasons/${seasonId}/soil-tests`,
  ];
  for (const path of farmerPaths) {
    await request(path, authorized(farmerToken));
    console.log(`${path}=OK`);
  }

  const employeeToken = await login('employee');
  await request('/api/v1/employee/tasks/my-tasks', authorized(employeeToken));
  console.log('EMPLOYEE_TASKS=OK');

  const buyerToken = await login('buyer');
  await request('/api/v1/marketplace/orders?size=20', authorized(buyerToken));
  console.log('BUYER_ORDERS=OK');

  const adminToken = await login('admin');
  await request('/api/v1/admin/dashboard-stats', authorized(adminToken));
  console.log('ADMIN_DASHBOARD=OK');

  await request('/api/v1/marketplace/products?size=20');
  console.log('PUBLIC_MARKETPLACE=OK');
  console.log('LOCAL_DEMO_SMOKE=PASS');
}

main().catch((error) => {
  console.error(`LOCAL_DEMO_SMOKE=FAIL ${error.message}`);
  process.exit(1);
});
