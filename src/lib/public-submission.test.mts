import test from "node:test";
import assert from "node:assert/strict";

import {
  PUBLIC_FORM_STARTED_FIELD_NAME,
  PUBLIC_HONEYPOT_FIELD_NAME,
  assertPublicSubmissionGuard,
} from "./public-submission.ts";

test("public submission guard accepts a regular submission", () => {
  const originalNow = Date.now;
  Date.now = () => 10_000;

  try {
    assert.doesNotThrow(() => {
      assertPublicSubmissionGuard({
        [PUBLIC_HONEYPOT_FIELD_NAME]: "",
        [PUBLIC_FORM_STARTED_FIELD_NAME]: "7000",
      });
    });
  } finally {
    Date.now = originalNow;
  }
});

test("public submission guard blocks filled honeypot", () => {
  assert.throws(
    () => {
      assertPublicSubmissionGuard({
        [PUBLIC_HONEYPOT_FIELD_NAME]: "https://spam.example",
      });
    },
    /spam_detected/
  );
});

test("public submission guard blocks submissions that are too fast", () => {
  const originalNow = Date.now;
  Date.now = () => 10_000;

  try {
    assert.throws(
      () => {
        assertPublicSubmissionGuard({
          [PUBLIC_HONEYPOT_FIELD_NAME]: "",
          [PUBLIC_FORM_STARTED_FIELD_NAME]: "9000",
        });
      },
      /submission_too_fast/
    );
  } finally {
    Date.now = originalNow;
  }
});