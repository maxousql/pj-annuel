import assert from "node:assert/strict";
import test from "node:test";

import {
  PHASE_DEVELOPMENT_SERVER,
  PHASE_PRODUCTION_BUILD,
  PHASE_PRODUCTION_SERVER,
} from "next/constants.js";

import { buildContentSecurityPolicy } from "./next.config.mjs";

test("development CSP allows the Next diagnostics runtime", () => {
  const policy = buildContentSecurityPolicy(
    PHASE_DEVELOPMENT_SERVER,
    "http://127.0.0.1:4000",
  );

  assert.match(policy, /script-src[^;]*'unsafe-eval'/);
  assert.match(policy, /form-action 'self'/);
});

for (const [name, phase] of [
  ["production build", PHASE_PRODUCTION_BUILD],
  ["production server", PHASE_PRODUCTION_SERVER],
]) {
  test(`${name} CSP excludes unsafe-eval`, () => {
    const policy = buildContentSecurityPolicy(
      phase,
      "https://api.example.test",
    );

    assert.doesNotMatch(policy, /script-src[^;]*'unsafe-eval'/);
    assert.match(policy, /form-action 'self'/);
  });
}
