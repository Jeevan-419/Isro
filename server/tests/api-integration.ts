/**
 * ============================================================================
 * BACKEND REST API AUTOMATED INTEGRATION TEST SUITE
 * ============================================================================
 * 
 * Tests the live Express HTTP API server across all key endpoints:
 * 1. GET  /api/health
 * 2. POST /api/tasks (Creation & Adaptive Inference with Attention Firewall)
 * 3. GET  /api/tasks/:id (State Retrieval)
 * 4. POST /api/tasks/:id/actions/plan-and-guard (End-to-End Planning & Safety Guard)
 * 5. POST /api/actions/approve (Approval of Safe Action)
 * 6. POST /api/actions/approve (Rejection of Malicious Credential Injection)
 * 7. DELETE /api/tasks/:id (Resource Cleanup)
 * 
 * Execution:
 *   npx tsx server/tests/api-integration.ts
 *   or: npm run test:api
 * ============================================================================
 */

const API_BASE = process.env.API_BASE || 'http://localhost:3001';

interface TestResult {
  name: string;
  passed: boolean;
  durationMs: number;
  error?: string;
  details?: string;
}

const results: TestResult[] = [];

async function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion Failed: ${message}`);
  }
}

async function runTest(name: string, fn: () => Promise<void>) {
  const start = Date.now();
  try {
    await fn();
    const durationMs = Date.now() - start;
    results.push({ name, passed: true, durationMs });
    console.log(`  ✔ PASS: ${name} (${durationMs}ms)`);
  } catch (err: unknown) {
    const durationMs = Date.now() - start;
    const error = err instanceof Error ? err.message : String(err);
    results.push({ name, passed: false, durationMs, error });
    console.error(`  ✖ FAIL: ${name} (${durationMs}ms) - ${error}`);
  }
}

async function startSuite() {
  console.log(`\n==============================================================================`);
  console.log(`  RUNNING AUTOMATED API INTEGRATION TEST SUITE against ${API_BASE}`);
  console.log(`==============================================================================\n`);

  let createdTaskId = '';

  // TEST 1: Health check
  await runTest('GET /api/health should report server healthy', async () => {
    const res = await fetch(`${API_BASE}/api/health`);
    assert(res.status === 200, `Expected HTTP 200, got ${res.status}`);
    const data = await res.json();
    assert(data.status === 'healthy', 'Expected status to be healthy');
    assert(typeof data.uptimeSeconds === 'number', 'Expected uptimeSeconds number');
  });

  // TEST 2: Task intake and perception plan synthesis
  await runTest('POST /api/tasks should process "Download electricity bill" and redact PII', async () => {
    const res = await fetch(`${API_BASE}/api/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        task: 'Download electricity bill',
        context: { currentUrl: 'https://portal.space-ops.gov.in/personnel/secure-registration' },
      }),
    });

    assert(res.status === 201, `Expected HTTP 201 Created, got ${res.status}`);
    const data = await res.json();
    assert(data.success === true, 'Expected success === true');
    assert(Boolean(data.data?.id), 'Expected task ID returned');
    createdTaskId = data.data.id;

    // Verify Requirements
    const reqs = data.data.requirements;
    assert(reqs.intent === 'click', `Expected intent 'click', got ${reqs.intent}`);
    assert(reqs.forbiddenInfo.maskSensitiveValues === true, 'Expected maskSensitiveValues === true');

    // Verify Attention Firewall and Adaptive Inference
    const adaptive = data.data.adaptiveInferenceResult;
    assert(Boolean(adaptive), 'Expected adaptiveInferenceResult present');
    assert(adaptive.firewallSummary.sensitiveElementsRedacted > 0, 'Expected sensitive elements redacted');
    
    // Check that sensitive fields have placeholders
    const payload = adaptive.sanitizedPerceptionPayload;
    const accountElem = payload.find((e: any) => e.domId === 'input-bill-account');
    if (accountElem) {
      assert(accountElem.isSensitive === true, 'input-bill-account should be sensitive');
      assert(accountElem.semanticPlaceholder !== null, 'input-bill-account should have semantic placeholder');
    }
  });

  // TEST 3: Retrieve task state by ID
  await runTest('GET /api/tasks/:id should retrieve stored task record', async () => {
    assert(Boolean(createdTaskId), 'createdTaskId must exist');
    const res = await fetch(`${API_BASE}/api/tasks/${createdTaskId}`);
    assert(res.status === 200, `Expected HTTP 200, got ${res.status}`);
    const data = await res.json();
    assert(data.data.id === createdTaskId, 'Expected matched task ID');
    assert(data.data.rawTask === 'Download electricity bill', 'Expected matched rawTask');
  });

  // TEST 4: End-to-end plan-and-guard
  await runTest('POST /api/tasks/:id/actions/plan-and-guard should propose and approve download', async () => {
    assert(Boolean(createdTaskId), 'createdTaskId must exist');
    const res = await fetch(`${API_BASE}/api/tasks/${createdTaskId}/actions/plan-and-guard`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });

    assert(res.status === 200, `Expected HTTP 200, got ${res.status}`);
    const data = await res.json();
    assert(data.success === true, 'Expected success === true');
    assert(data.isApproved === true, 'Expected action to be approved');
    assert(data.status === 'APPROVED', 'Expected status to be APPROVED');
    assert(
      data.proposedAction.targetSelector.includes('download') || data.proposedAction.targetSelector.includes('bill'),
      'Proposed action should target download electricity bill button'
    );
  });

  // TEST 5: Standalone action approval (Safe Action)
  await runTest('POST /api/actions/approve should approve benign button click', async () => {
    const res = await fetch(`${API_BASE}/api/actions/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: {
          actionId: 'test-act-1',
          actionType: 'CLICK',
          targetSelector: '#download-electricity-bill-btn',
          targetElementId: 'download-electricity-bill-btn',
          confidenceScore: 95,
          estimatedRisk: 'LOW',
          rationale: 'Download bill test',
        },
      }),
    });

    assert(res.status === 200, `Expected HTTP 200, got ${res.status}`);
    const data = await res.json();
    assert(data.status === 'APPROVED', 'Expected APPROVED status');
    assert(data.executionResult.dispatched === true, 'Expected dispatched === true');
  });

  // TEST 6: Standalone action rejection (DLP privacy violation)
  await runTest('POST /api/actions/approve should block unmasked plaintext credentials (403)', async () => {
    const res = await fetch(`${API_BASE}/api/actions/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: {
          actionId: 'test-act-malicious',
          actionType: 'TYPE_TEXT',
          targetSelector: '#input-password',
          targetElementId: 'input-password',
          valuePayload: 'supersecret_password_leak_attempt',
          confidenceScore: 90,
          estimatedRisk: 'HIGH',
          rationale: 'Simulated leak',
        },
      }),
    });

    assert(res.status === 403, `Expected HTTP 403 Forbidden, got ${res.status}`);
    const data = await res.json();
    assert(data.status === 'BLOCKED', 'Expected BLOCKED status');
    assert(typeof data.reason === 'string', 'Expected clear block reason');
  });

  // TEST 7: Delete task
  await runTest('DELETE /api/tasks/:id should clean up task record', async () => {
    assert(Boolean(createdTaskId), 'createdTaskId must exist');
    const res = await fetch(`${API_BASE}/api/tasks/${createdTaskId}`, {
      method: 'DELETE',
    });

    assert(res.status === 200, `Expected HTTP 200, got ${res.status}`);
    const data = await res.json();
    assert(data.success === true, 'Expected deletion success');
  });

  // Final summary
  const passedCount = results.filter((r) => r.passed).length;
  console.log(`\n==============================================================================`);
  console.log(`  INTEGRATION TEST SUMMARY: ${passedCount} / ${results.length} PASSED`);
  if (passedCount === results.length) {
    console.log(`  STATUS: ALL AUTOMATED TESTS PASSED SUCCESSFULLY! 🚀`);
  } else {
    console.log(`  STATUS: SOME TESTS FAILED`);
  }
  console.log(`==============================================================================\n`);

  if (passedCount < results.length) {
    process.exit(1);
  }
}

startSuite().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
