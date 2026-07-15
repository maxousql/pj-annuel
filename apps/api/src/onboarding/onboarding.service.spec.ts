import {
  getAvailableAdvancedSteps,
  OnboardingService,
  reconcileCompletedAdvancedSteps,
} from "./onboarding.service";
import { ConflictException, ForbiddenException } from "@nestjs/common";

describe("advanced onboarding role routing", () => {
  it("gives administrators the full setup checklist", () => {
    expect(getAvailableAdvancedSteps("ADMIN")).toEqual([
      "CHECKLIST",
      "PRESET",
      "FIRST_IDEA",
      "FIRST_CONTENT",
      "DONE",
    ]);
  });

  it("does not ask readers to configure or generate content", () => {
    expect(getAvailableAdvancedSteps("READER")).toEqual(["CHECKLIST", "DONE"]);
  });

  it("shows readers their checklist and completes it from the real context", () => {
    expect(
      reconcileCompletedAdvancedSteps({
        availableSteps: getAvailableAdvancedSteps("READER"),
        checklistComplete: true,
        firstContentComplete: false,
        firstIdeaComplete: false,
        skipped: false,
        storedSteps: [],
      }),
    ).toMatchObject({
      allDone: true,
      completedSteps: ["CHECKLIST", "DONE"],
      currentStep: "DONE",
    });
  });

  it("removes stale DONE after prerequisites or the member role change", () => {
    const result = reconcileCompletedAdvancedSteps({
      availableSteps: getAvailableAdvancedSteps("EDITOR"),
      checklistComplete: true,
      firstContentComplete: false,
      firstIdeaComplete: true,
      skipped: false,
      storedSteps: [
        "CHECKLIST",
        "PRESET",
        "FIRST_IDEA",
        "FIRST_CONTENT",
        "DONE",
      ],
    });

    expect(result.allDone).toBe(false);
    expect(result.completedSteps).not.toContain("DONE");
    expect(result.completedSteps).not.toContain("PRESET");
    expect(result.currentStep).toBe("FIRST_CONTENT");
  });

  it("rejects preset application by an editor at the service boundary", async () => {
    const service = new OnboardingService({} as never, {} as never);

    await expect(
      service.applyPreset("editor", organizationContext("EDITOR"), {
        confirmOverwrite: true,
        presetId: "saas-b2b",
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("checks overwrite confirmation inside the serializable transaction", async () => {
    const transaction = {
      editorialContext: {
        findUnique: jest.fn().mockResolvedValue({ id: "context" }),
        upsert: jest.fn(),
      },
      onboardingProgress: {
        findUnique: jest.fn().mockResolvedValue(null),
        upsert: jest.fn(),
      },
    };
    const prisma = {
      $transaction: jest.fn(
        async (handler: (client: typeof transaction) => Promise<unknown>) =>
          handler(transaction),
      ),
    };
    const service = new OnboardingService(prisma as never, {} as never);

    await expect(
      service.applyPreset("admin", organizationContext("ADMIN"), {
        confirmOverwrite: false,
        presetId: "saas-b2b",
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(transaction.editorialContext.upsert).not.toHaveBeenCalled();
    expect(prisma.$transaction).toHaveBeenCalledWith(expect.any(Function), {
      isolationLevel: "Serializable",
    });
  });
});

function organizationContext(role: "ADMIN" | "EDITOR") {
  return {
    membership: { id: "membership", role, status: "ACTIVE" as const },
    organization: {
      createdAt: new Date().toISOString(),
      id: "organization",
      name: "Organization",
      ownerId: "admin",
      role,
      slug: "organization",
    },
  };
}
