"use client";

import { useState } from "react";
import { PUBLIC_FORM_STARTED_FIELD_NAME, PUBLIC_HONEYPOT_FIELD_NAME } from "@/lib/public-submission";

export function PublicSubmissionFields() {
  const [formStartedAt] = useState(() => Date.now());

  return (
    <>
      <input type="hidden" name={PUBLIC_FORM_STARTED_FIELD_NAME} value={String(formStartedAt)} />
      <div className="hidden" aria-hidden="true">
        <label htmlFor={PUBLIC_HONEYPOT_FIELD_NAME}>Website</label>
        <input id={PUBLIC_HONEYPOT_FIELD_NAME} name={PUBLIC_HONEYPOT_FIELD_NAME} type="text" tabIndex={-1} autoComplete="off" />
      </div>
    </>
  );
}