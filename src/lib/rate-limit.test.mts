import test from "node:test";
import assert from "node:assert/strict";

import { checkRateLimit } from "./rate-limit.ts";

test("rate limit allows requests until the configured limit and then blocks", () => {
  const key = `rate-limit-${Date.now()}-allow-block`;

  const first = checkRateLimit(key, { limit: 2, windowMs: 1000 });
  const second = checkRateLimit(key, { limit: 2, windowMs: 1000 });
  const third = checkRateLimit(key, { limit: 2, windowMs: 1000 });

  assert.equal(first.success, true);
  assert.equal(second.success, true);
  assert.equal(second.remaining, 0);
  assert.equal(third.success, false);
  assert.ok(third.retryAfterMs > 0);
});

test("rate limit resets after the window expires", () => {
  const originalNow = Date.now;
  const key = `rate-limit-${originalNow()}-reset`;
  let now = 5_000;
  Date.now = () => now;

  try {
    const first = checkRateLimit(key, { limit: 1, windowMs: 1000 });
    now = 5_500;
    const blocked = checkRateLimit(key, { limit: 1, windowMs: 1000 });
    now = 6_100;
    const reset = checkRateLimit(key, { limit: 1, windowMs: 1000 });

    assert.equal(first.success, true);
    assert.equal(blocked.success, false);
    assert.equal(reset.success, true);
  } finally {
    Date.now = originalNow;
  }
});