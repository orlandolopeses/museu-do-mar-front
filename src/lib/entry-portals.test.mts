import { test } from "node:test";
import assert from "node:assert/strict";
import { entryPortals, getEntryPortal, isEntryPortalSlug } from "./entry-portals.ts";

test("entry portals expose the three public MVP faces", () => {
  const slugs = Object.keys(entryPortals).sort();
  assert.deepEqual(slugs, ["apoiadores", "implementacao", "participantes"]);
});

test("slug guard accepts only known values", () => {
  assert.equal(isEntryPortalSlug("implementacao"), true);
  assert.equal(isEntryPortalSlug("participantes"), true);
  assert.equal(isEntryPortalSlug("apoiadores"), true);
  assert.equal(isEntryPortalSlug("outro"), false);
  assert.equal(isEntryPortalSlug(null), false);
});

test("portal lookup returns null for unknown values", () => {
  assert.equal(getEntryPortal("outro"), null);
  assert.equal(getEntryPortal(undefined), null);
  assert.equal(getEntryPortal("participantes")?.title, "Participantes");
});
