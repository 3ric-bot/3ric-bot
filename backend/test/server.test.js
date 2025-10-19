const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { randomUUID } = require('node:crypto');

process.env.ALLOWED_ORIGINS = '*';
process.env.ACCESS_TOKEN_SECRET = 'test-access-secret';
process.env.REFRESH_TOKEN_SECRET = 'test-refresh-secret';
process.env.RATE_LIMIT_MAX = '1000';
process.env.DEVICE_ID_REQUIRED = 'true';
const tempStatePath = path.join(os.tmpdir(), `learnzo-test-${randomUUID()}.json`);
process.env.DATA_STORE_DRIVER = 'journaled';
process.env.DATA_STORE_PATH = tempStatePath;

const { createServer, resetServerState } = require('../src/server');

test.after(() => {
  try {
    fs.rmSync(tempStatePath, { force: true });
  } catch (error) {
    console.warn('Failed to clean up temp state file', error);
  }
  try {
    fs.rmSync(`${tempStatePath}.bak`, { force: true });
    fs.rmSync(`${tempStatePath}.sha256`, { force: true });
  } catch (error) {
    console.warn('Failed to clean up backup state artifacts', error);
  }
});

async function startServer() {
  resetServerState();
  const { server } = createServer();
  await new Promise((resolve) => server.listen(0, resolve));
  const address = server.address();
  const baseUrl = `http://127.0.0.1:${address.port}`;
  return {
    server,
    baseUrl,
    close: () => new Promise((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())))
  };
}

test('public API catalog exposes endpoint metadata', async (t) => {
  const ctx = await startServer();
  t.after(() => ctx.close());

  const response = await fetch(`${ctx.baseUrl}/meta/endpoints`);
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.ok(Array.isArray(body.endpoints), 'endpoints array returned');
  assert.ok(body.updatedAt, 'timestamp included');
  const loginEndpoint = body.endpoints.find(
    (endpoint) => endpoint.path === '/auth/login' && endpoint.method === 'POST'
  );
  assert.ok(loginEndpoint, 'login endpoint documented');
  assert.equal(loginEndpoint.name, 'Auth: Login');
  const catalogSelf = body.endpoints.find(
    (endpoint) => endpoint.path === '/meta/endpoints' && endpoint.method === 'GET'
  );
  assert.ok(catalogSelf, 'catalog includes self-reference');
});

test('student flows expose tracking, privacy and calendar endpoints', async (t) => {
  const ctx = await startServer();
  t.after(() => ctx.close());
  const deviceId = 'device-test-1';

  const loginResponse = await fetch(`${ctx.baseUrl}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Device-ID': deviceId
    },
    body: JSON.stringify({
      email: 'ada@student.learnzo.io',
      password: 'Student123!',
      deviceId
    })
  });

  assert.equal(loginResponse.status, 200);
  const loginBody = await loginResponse.json();
  assert.ok(loginBody.accessToken, 'access token is returned');
  assert.ok(loginBody.refreshToken, 'refresh token is returned');
  assert.match(loginResponse.headers.get('set-cookie') || '', /learnzo_refresh_token=/);

  const eventResponse = await fetch(`${ctx.baseUrl}/events`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${loginBody.accessToken}`,
      'X-Device-ID': deviceId
    },
    body: JSON.stringify({
      type: 'lesson.open',
      metadata: { lessonId: 'les-html-structuur' },
      source: 'test-suite'
    })
  });
  assert.equal(eventResponse.status, 202);

  const eventList = await fetch(`${ctx.baseUrl}/events?limit=5`, {
    headers: {
      Authorization: `Bearer ${loginBody.accessToken}`,
      'X-Device-ID': deviceId
    }
  });
  assert.equal(eventList.status, 200);
  const { events } = await eventList.json();
  assert.ok(events.some((entry) => entry.type === 'lesson.open'));

  const privacyResponse = await fetch(`${ctx.baseUrl}/privacy/export`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${loginBody.accessToken}`,
      'X-Device-ID': deviceId
    },
    body: JSON.stringify({ reason: 'test-suite' })
  });
  assert.equal(privacyResponse.status, 202);
  const privacyBody = await privacyResponse.json();
  assert.equal(privacyBody.request.requestType, 'export');

  const calendarToken = await fetch(`${ctx.baseUrl}/calendar/feed-token`, {
    headers: {
      Authorization: `Bearer ${loginBody.accessToken}`,
      'X-Device-ID': deviceId
    }
  });
  assert.equal(calendarToken.status, 200);
  const { token } = await calendarToken.json();
  assert.ok(token, 'calendar token present');

  const calendarFeed = await fetch(`${ctx.baseUrl}/calendar/feed.ics?token=${token}`);
  assert.equal(calendarFeed.status, 200);
  const icsText = await calendarFeed.text();
  assert.match(icsText, /BEGIN:VCALENDAR/);
});

test('admins can review privacy requests created by learners', async (t) => {
  const ctx = await startServer();
  t.after(() => ctx.close());
  const learnerDevice = 'device-learner';

  const learnerLogin = await fetch(`${ctx.baseUrl}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Device-ID': learnerDevice
    },
    body: JSON.stringify({
      email: 'ada@student.learnzo.io',
      password: 'Student123!',
      deviceId: learnerDevice
    })
  });
  const learnerTokens = await learnerLogin.json();

  await fetch(`${ctx.baseUrl}/privacy/delete`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${learnerTokens.accessToken}`,
      'X-Device-ID': learnerDevice
    },
    body: JSON.stringify({ reason: 'cleanup' })
  });

  const adminDevice = 'device-admin';
  const adminLogin = await fetch(`${ctx.baseUrl}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Device-ID': adminDevice
    },
    body: JSON.stringify({
      email: 'alex.admin@learnzo.io',
      password: 'Admin123!',
      deviceId: adminDevice
    })
  });
  const adminTokens = await adminLogin.json();

  const queueResponse = await fetch(`${ctx.baseUrl}/admin/privacy-requests`, {
    headers: {
      Authorization: `Bearer ${adminTokens.accessToken}`,
      'X-Device-ID': adminDevice
    }
  });
  assert.equal(queueResponse.status, 200);
  const queueBody = await queueResponse.json();
  assert.ok(Array.isArray(queueBody.requests));
  assert.ok(
    queueBody.requests.some((request) => request.userId === 'user-student-1' && request.status === 'open')
  );

  const auditResponse = await fetch(`${ctx.baseUrl}/admin/audit-log?limit=10`, {
    headers: {
      Authorization: `Bearer ${adminTokens.accessToken}`,
      'X-Device-ID': adminDevice
    }
  });
  assert.equal(auditResponse.status, 200);
  const auditBody = await auditResponse.json();
  assert.ok(
    Array.isArray(auditBody.auditLog) &&
      auditBody.auditLog.some((entry) => entry.event === 'privacy.request.delete')
  );
});

test('admin promotions endpoints enforce RBAC and lifecycle controls', async (t) => {
  const ctx = await startServer();
  t.after(() => ctx.close());

  const learnerDevice = 'device-promotions-student';
  const learnerLogin = await fetch(`${ctx.baseUrl}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Device-ID': learnerDevice
    },
    body: JSON.stringify({
      email: 'ada@student.learnzo.io',
      password: 'Student123!',
      deviceId: learnerDevice
    })
  });
  assert.equal(learnerLogin.status, 200);
  const learnerTokens = await learnerLogin.json();

  const forbiddenResponse = await fetch(`${ctx.baseUrl}/admin/promotions`, {
    headers: {
      Authorization: `Bearer ${learnerTokens.accessToken}`,
      'X-Device-ID': learnerDevice
    }
  });
  assert.equal(forbiddenResponse.status, 403);

  const adminDevice = 'device-promotions-admin';
  const adminLogin = await fetch(`${ctx.baseUrl}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Device-ID': adminDevice
    },
    body: JSON.stringify({
      email: 'alex.admin@learnzo.io',
      password: 'Admin123!',
      deviceId: adminDevice
    })
  });
  assert.equal(adminLogin.status, 200);
  const adminTokens = await adminLogin.json();

  const listResponse = await fetch(`${ctx.baseUrl}/admin/promotions`, {
    headers: {
      Authorization: `Bearer ${adminTokens.accessToken}`,
      'X-Device-ID': adminDevice
    }
  });
  assert.equal(listResponse.status, 200);
  const listBody = await listResponse.json();
  assert.ok(Array.isArray(listBody.promotions));

  const campaignCode = `bf-${randomUUID().slice(0, 6)}`;
  const createPayload = {
    name: 'Black Friday 30% off',
    code: campaignCode,
    discountType: 'percentage',
    value: 30,
    startsAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    endsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    usageLimit: 150,
    perUserLimit: 1,
    stackable: false,
    appliesTo: { plans: ['pro-annual'] },
    notes: 'Automated test campaign'
  };

  const createResponse = await fetch(`${ctx.baseUrl}/admin/promotions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminTokens.accessToken}`,
      'X-Device-ID': adminDevice
    },
    body: JSON.stringify(createPayload)
  });
  assert.equal(createResponse.status, 201);
  const createBody = await createResponse.json();
  assert.ok(createBody.promotion.id);
  assert.equal(createBody.promotion.code, campaignCode.toUpperCase());
  assert.equal(createBody.promotion.status, 'draft');

  const promotionId = createBody.promotion.id;

  const patchResponse = await fetch(`${ctx.baseUrl}/admin/promotions/${promotionId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminTokens.accessToken}`,
      'X-Device-ID': adminDevice
    },
    body: JSON.stringify({ value: 35, notes: 'Updated discount rate' })
  });
  assert.equal(patchResponse.status, 200);
  const patchBody = await patchResponse.json();
  assert.equal(patchBody.promotion.value, 35);
  assert.equal(patchBody.promotion.notes, 'Updated discount rate');

  const activateResponse = await fetch(`${ctx.baseUrl}/admin/promotions/${promotionId}/activate`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${adminTokens.accessToken}`,
      'X-Device-ID': adminDevice
    }
  });
  assert.equal(activateResponse.status, 200);
  const activateBody = await activateResponse.json();
  assert.equal(activateBody.promotion.status, 'active');

  const pauseResponse = await fetch(`${ctx.baseUrl}/admin/promotions/${promotionId}/pause`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${adminTokens.accessToken}`,
      'X-Device-ID': adminDevice
    }
  });
  assert.equal(pauseResponse.status, 200);
  const pauseBody = await pauseResponse.json();
  assert.equal(pauseBody.promotion.status, 'paused');

  const archiveResponse = await fetch(`${ctx.baseUrl}/admin/promotions/${promotionId}/archive`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${adminTokens.accessToken}`,
      'X-Device-ID': adminDevice
    }
  });
  assert.equal(archiveResponse.status, 200);
  const archiveBody = await archiveResponse.json();
  assert.equal(archiveBody.promotion.status, 'archived');

  const filteredList = await fetch(`${ctx.baseUrl}/admin/promotions`, {
    headers: {
      Authorization: `Bearer ${adminTokens.accessToken}`,
      'X-Device-ID': adminDevice
    }
  });
  const filteredBody = await filteredList.json();
  assert.ok(
    filteredBody.promotions.every((promotion) => promotion.status !== 'archived'),
    'archived promotions filtered out by default'
  );

  const archivedList = await fetch(`${ctx.baseUrl}/admin/promotions?includeArchived=true`, {
    headers: {
      Authorization: `Bearer ${adminTokens.accessToken}`,
      'X-Device-ID': adminDevice
    }
  });
  const archivedBody = await archivedList.json();
  assert.ok(archivedBody.promotions.some((promotion) => promotion.id === promotionId));

  const duplicateResponse = await fetch(`${ctx.baseUrl}/admin/promotions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminTokens.accessToken}`,
      'X-Device-ID': adminDevice
    },
    body: JSON.stringify({ ...createPayload, code: campaignCode })
  });
  assert.equal(duplicateResponse.status, 409);
});

test('users can register, change subscriptions and earn gamification rewards', async (t) => {
  const ctx = await startServer();
  t.after(() => ctx.close());
  const deviceId = 'device-register';
  const email = `new-${randomUUID().slice(0, 8)}@example.com`;

  const registerResponse = await fetch(`${ctx.baseUrl}/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Device-ID': deviceId
    },
    body: JSON.stringify({
      email,
      password: 'Register123!',
      name: 'Nieuw Lid',
      locale: 'nl-NL',
      plan: 'free',
      deviceId
    })
  });

  assert.equal(registerResponse.status, 201);
  const registerBody = await registerResponse.json();
  assert.ok(registerBody.accessToken);
  assert.ok(registerBody.refreshToken);
  assert.equal(registerBody.user.email, email);

  const subscriptionResponse = await fetch(`${ctx.baseUrl}/subscriptions/change`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${registerBody.accessToken}`,
      'X-Device-ID': deviceId
    },
    body: JSON.stringify({ plan: 'pro-annual', status: 'active' })
  });

  assert.equal(subscriptionResponse.status, 200);
  const subscriptionBody = await subscriptionResponse.json();
  assert.equal(subscriptionBody.subscription.plan, 'pro-annual');
  assert.equal(subscriptionBody.subscription.status, 'active');
  assert.ok(subscriptionBody.planDetails);

  const gamificationResponse = await fetch(`${ctx.baseUrl}/gamification`, {
    headers: {
      Authorization: `Bearer ${registerBody.accessToken}`,
      'X-Device-ID': deviceId
    }
  });
  assert.equal(gamificationResponse.status, 200);
  const gamificationBody = await gamificationResponse.json();
  const initialAchievements = gamificationBody.gamification.achievements.length;
  const initialXp = gamificationBody.gamification.xp;

  const streakResponse = await fetch(`${ctx.baseUrl}/gamification/streak`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${registerBody.accessToken}`,
      'X-Device-ID': deviceId
    },
    body: JSON.stringify({ action: 'increment', amount: 1 })
  });
  assert.equal(streakResponse.status, 200);
  const streakBody = await streakResponse.json();
  assert.ok(streakBody.streak.current >= 1);

  const mentorDevice = 'device-mentor-award';
  const mentorLogin = await fetch(`${ctx.baseUrl}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Device-ID': mentorDevice
    },
    body: JSON.stringify({
      email: 'mina.mentor@learnzo.io',
      password: 'Mentor123!',
      deviceId: mentorDevice
    })
  });
  const mentorTokens = await mentorLogin.json();

  const awardPoints = 75;
  const awardResponse = await fetch(`${ctx.baseUrl}/gamification/award`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${mentorTokens.accessToken}`,
      'X-Device-ID': mentorDevice
    },
    body: JSON.stringify({
      userId: registerBody.user.id,
      type: 'mentor-recognition',
      title: 'Mentor compliment',
      description: 'Erkende bijdrage in de community',
      points: awardPoints
    })
  });

  assert.equal(awardResponse.status, 201);
  const awardBody = await awardResponse.json();
  assert.equal(awardBody.achievement.points, awardPoints);

  const gamificationAfter = await fetch(`${ctx.baseUrl}/gamification`, {
    headers: {
      Authorization: `Bearer ${registerBody.accessToken}`,
      'X-Device-ID': deviceId
    }
  });
  const gamificationAfterBody = await gamificationAfter.json();
  assert.ok(
    gamificationAfterBody.gamification.achievements.length >= initialAchievements + 1,
    'achievement should increase'
  );
  assert.ok(
    gamificationAfterBody.gamification.xp >= initialXp + awardPoints,
    'xp should include awarded points'
  );
});

test('ai guardrails, observability and enterprise integrations respond', async (t) => {
  const ctx = await startServer();
  t.after(() => ctx.close());

  const studentDevice = 'device-ai';
  const studentLogin = await fetch(`${ctx.baseUrl}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Device-ID': studentDevice
    },
    body: JSON.stringify({
      email: 'ada@student.learnzo.io',
      password: 'Student123!',
      deviceId: studentDevice
    })
  });
  const studentTokens = await studentLogin.json();

  const guardrailResponse = await fetch(`${ctx.baseUrl}/ai/hints`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${studentTokens.accessToken}`,
      'X-Device-ID': studentDevice
    },
    body: JSON.stringify({
      assignmentId: 'assign-array-utilities',
      question: 'Geef me de volledige oplossing nu',
      code: 'return []',
      failingTests: ['Voegt alleen actieve gebruikers toe']
    })
  });
  assert.equal(guardrailResponse.status, 400, 'guardrail blocks solution request');

  const hintResponse = await fetch(`${ctx.baseUrl}/ai/hints`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${studentTokens.accessToken}`,
      'X-Device-ID': studentDevice
    },
    body: JSON.stringify({
      assignmentId: 'assign-array-utilities',
      question: 'Waarom faalt de test op actieve gebruikers?',
      failingTests: ['Voegt alleen actieve gebruikers toe'],
      code: 'export function getActiveUsers(users) {\n  return users.filter((user) => user.active);\n}'
    })
  });
  assert.equal(hintResponse.status, 200, 'guardrail allows reflective hint');
  const hintPayload = await hintResponse.json();
  assert.ok(hintPayload.hint.guardrails.prohibitsSolutions);

  const metricsResponse = await fetch(`${ctx.baseUrl}/metrics`);
  assert.equal(metricsResponse.status, 200);
  const metricsText = await metricsResponse.text();
  assert.match(metricsText, /http_requests_total/);

  const adminDevice = 'device-enterprise';
  const adminLogin = await fetch(`${ctx.baseUrl}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Device-ID': adminDevice
    },
    body: JSON.stringify({
      email: 'alex.admin@learnzo.io',
      password: 'Admin123!',
      deviceId: adminDevice
    })
  });
  const adminTokens = await adminLogin.json();

  const registrationResponse = await fetch(`${ctx.baseUrl}/lti/registrations`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminTokens.accessToken}`,
      'X-Device-ID': adminDevice
    },
    body: JSON.stringify({
      institution: 'Automation College',
      clientId: 'lti-client-test',
      deploymentId: 'deployment-automation',
      platformUrl: 'https://lms.automation.test',
      jwksUrl: 'https://lms.automation.test/jwks.json'
    })
  });
  assert.equal(registrationResponse.status, 201);

  const launchResponse = await fetch(`${ctx.baseUrl}/lti/launch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      clientId: 'lti-client-test',
      deploymentId: 'deployment-automation',
      userId: 'user-student-1'
    })
  });
  assert.equal(launchResponse.status, 200);

  const scimResponse = await fetch(`${ctx.baseUrl}/scim/v2/users`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminTokens.accessToken}`,
      'X-Device-ID': adminDevice
    },
    body: JSON.stringify({
      externalId: 'ext-auto-1',
      email: 'scim-user@automation.test',
      givenName: 'Scim',
      familyName: 'User',
      role: 'student'
    })
  });
  assert.equal(scimResponse.status, 201);

  const affiliateResponse = await fetch(`${ctx.baseUrl}/affiliate/partners`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminTokens.accessToken}`,
      'X-Device-ID': adminDevice
    },
    body: JSON.stringify({ code: 'AUTOREF', name: 'Automation Referrer', payoutPercentage: 25 })
  });
  assert.equal(affiliateResponse.status, 201);
  const partnerBody = await affiliateResponse.json();
  assert.equal(partnerBody.partner.code, 'AUTOREF');
});
