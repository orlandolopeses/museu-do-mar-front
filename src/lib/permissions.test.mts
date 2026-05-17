import test from "node:test";
import assert from "node:assert/strict";

import {
  canAccessAdmin,
  extractPermissions,
  extractRoles,
  getDefaultAuthenticatedPath,
  getPrimaryRole,
  needsProfileOnboarding,
} from "./permissions.ts";

test("extractRoles and extractPermissions merge root and user values without duplicates", () => {
  const subject = {
    roles: ["professor", "professor"],
    permissions: ["blog.create"],
    user: {
      roles: ["gestor_educacional", "professor"],
      permissions: ["forum.moderate", "blog.create"],
    },
  };

  assert.deepEqual(extractRoles(subject), ["professor", "gestor_educacional"]);
  assert.deepEqual(extractPermissions(subject), ["blog.create", "forum.moderate"]);
});

test("canAccessAdmin returns true for admin permissions even without legacy admin flag", () => {
  const subject = {
    user: {
      roles: ["comunicador"],
      permissions: ["eventos.manage"],
    },
  };

  assert.equal(canAccessAdmin(subject), true);
});

test("getDefaultAuthenticatedPath sends educational managers to their dedicated area", () => {
  const subject = {
    user: {
      primaryRole: "gestor_educacional",
      roles: ["gestor_educacional"],
    },
  };

  assert.equal(getPrimaryRole(subject), "gestor");
  assert.equal(getDefaultAuthenticatedPath(subject), "/app/gestor-educacional");
});

test("getDefaultAuthenticatedPath sends communication team to dedicated area", () => {
  const subject = {
    user: {
      primaryRole: "comunicador",
      roles: ["comunicador"],
    },
  };

  assert.equal(getPrimaryRole(subject), "equipe_comunicacao");
  assert.equal(getDefaultAuthenticatedPath(subject), "/app/equipe-comunicacao");
});

test("getDefaultAuthenticatedPath sends unconfigured participant to onboarding", () => {
  const subject = {
    user: {
      roles: [],
      permissions: [],
      isAdmin: false,
    },
  };

  assert.equal(needsProfileOnboarding(subject), true);
  assert.equal(getDefaultAuthenticatedPath(subject), "/app/boas-vindas");
});

test("getDefaultAuthenticatedPath sends scholarship profile to dedicated area", () => {
  const subject = {
    user: {
      primaryRole: "bolsista",
      roles: ["bolsista"],
    },
  };

  assert.equal(getDefaultAuthenticatedPath(subject), "/app/bolsista");
});

test("getDefaultAuthenticatedPath sends production team to dedicated area", () => {
  const subject = {
    user: {
      primaryRole: "equipe_producao",
      roles: ["equipe_producao"],
    },
  };

  assert.equal(getDefaultAuthenticatedPath(subject), "/app/equipe-producao");
});