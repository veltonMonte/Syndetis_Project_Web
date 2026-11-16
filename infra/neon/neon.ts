import { defineConfig } from "@neon/config/v1";

/**
 * Syndetis on Neon: Postgres only. Auth, payments and events stay in the Syndetis services
 * (auth-service, core-service, integration-hub with Redis Streams), so no Neon service is declared.
 *
 * Branch policy:
 * - production (the default branch) is never changed by `neon deploy`: compute, protection and
 *   settings stay as configured in the console.
 * - every new branch (tests, previews) is small and expires on its own.
 */
export default defineConfig({
  branch: (branch) => {
    if (branch.isDefault) return {};
    if (!branch.exists) {
      return {
        ttl: "7d",
        postgres: {
          computeSettings: {
            autoscalingLimitMinCu: 0.25,
            autoscalingLimitMaxCu: 0.25,
          },
        },
      };
    }
    return {};
  },
});
