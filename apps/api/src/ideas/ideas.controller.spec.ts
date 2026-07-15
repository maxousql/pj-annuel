import { ORGANIZATION_ROLES_KEY } from "../organizations/roles.decorator";
import { IdeasController } from "./ideas.controller";

describe("IdeasController discovery RBAC", () => {
  it.each([
    "getDiscoveryFeed",
    "generateDiscoveryFeed",
    "submitDiscoveryFeedback",
    "resetDiscoveryPreferences",
  ] as const)("requires an editor for %s", (methodName) => {
    expect(
      Reflect.getMetadata(
        ORGANIZATION_ROLES_KEY,
        IdeasController.prototype[methodName],
      ),
    ).toEqual(["EDITOR"]);
  });
});
