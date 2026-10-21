import { describe, expect, it } from "vitest";

import { accountUrl, firstName } from "./session";

describe("accountUrl", () => {
  it("sends people to the account page, set to bring them back", () => {
    expect(accountUrl("https://album-cover-maker.irmahs.dev/make")).toBe(
      "https://auth.irmahs.dev/sign-in?redirect=https%3A%2F%2Falbum-cover-maker.irmahs.dev%2Fmake"
    );
  });
});

describe("firstName", () => {
  it("greets by first name, or by email when there is none", () => {
    const user = { email: "irma@example.com", image: null };

    expect(firstName({ ...user, name: "Irma Houver Sing" })).toBe("Irma");
    expect(firstName({ ...user, name: "  " })).toBe("irma@example.com");
  });
});
