import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./env", () => ({
  ENV: {
    keycloakUrl: "https://auth.example.com",
    keycloakRealm: "biocollect",
    keycloakAdminUsername: "admin",
    keycloakAdminPassword: "secret",
    keycloakActionsClientId: "biocollect-web",
    appPublicUrl: "",
  },
}));

describe("keycloakAdmin safe JSON parsing", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response("<!DOCTYPE html><html></html>", {
          status: 200,
          headers: { "Content-Type": "text/html" },
        })
      )
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("rejects HTML token responses with a clear message", async () => {
    const { findKeycloakUserByEmail, resetKeycloakAdminTokenCacheForTests } =
      await import("./keycloakAdmin");
    resetKeycloakAdminTokenCacheForTests();

    await expect(findKeycloakUserByEmail("admin@test.tg")).rejects.toThrow(
      /page HTML/i
    );
    await expect(findKeycloakUserByEmail("admin@test.tg")).rejects.not.toThrow(
      /Unexpected token/i
    );
  });

  it("rejects redirect responses on token fetch", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response("", {
          status: 302,
          headers: { Location: "https://auth.example.com/" },
        })
      )
    );

    const { findKeycloakUserByEmail, resetKeycloakAdminTokenCacheForTests } =
      await import("./keycloakAdmin");
    resetKeycloakAdminTokenCacheForTests();

    await expect(findKeycloakUserByEmail("admin@test.tg")).rejects.toThrow(
      /redirigé/i
    );
  });
});
