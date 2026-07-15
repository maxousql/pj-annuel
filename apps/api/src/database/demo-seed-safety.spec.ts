import { assertDemoSeedSafety } from "./demo-seed-safety";

describe("demo seed safety", () => {
  it("requires a separate explicit opt-in", () => {
    expect(() =>
      assertDemoSeedSafety(
        { NODE_ENV: "development", SEED_DEMO_DATA: "true" },
        "postgresql://postgres:postgres@127.0.0.1:5432/content_ai_demo",
      ),
    ).toThrow("ALLOW_DEMO_SEED=true");
  });

  it("rejects managed or production-looking databases even with a wrong NODE_ENV", () => {
    expect(() =>
      assertDemoSeedSafety(
        {
          ALLOW_DEMO_SEED: "true",
          NODE_ENV: "development",
          SEED_DEMO_DATA: "true",
        },
        "postgresql://user:secret@db.example.supabase.co:5432/content_ai_demo",
      ),
    ).toThrow("restricted to a loopback database");
    expect(() =>
      assertDemoSeedSafety(
        {
          ALLOW_DEMO_SEED: "true",
          NODE_ENV: "development",
          SEED_DEMO_DATA: "true",
        },
        "postgresql://postgres:postgres@127.0.0.1:5432/production",
      ),
    ).toThrow("explicitly named demo, dev, test or local");
  });

  it("allows an explicitly named isolated local demo database", () => {
    expect(
      assertDemoSeedSafety(
        {
          ALLOW_DEMO_SEED: "true",
          NODE_ENV: "development",
          SEED_DEMO_DATA: "true",
        },
        "postgresql://postgres:postgres@localhost:5432/content_ai_demo",
      ),
    ).toBe(true);
  });
});
