import { describe, expect, it } from "vitest";
import { translate } from "./translations";

describe("translations", () => {
  it("should lookup simple English keys", () => {
    expect(translate("en", "header_title")).toBe("Knihobot Seller Estimator");
    expect(translate("en", "form_condition_good")).toBe("Good");
  });

  it("should lookup simple Czech keys", () => {
    expect(translate("cs", "header_title")).toBe("Knihobot Oceňovač");
    expect(translate("cs", "form_condition_good")).toBe("Dobrý");
  });

  it("should fallback to English key if Czech key is missing", () => {
    // translations.en has "header_title", let's simulate missing key
    expect(translate("cs", "non_existent_key")).toBe("non_existent_key");
  });

  it("should interpolate parameters correctly", () => {
    const text = translate("en", "card_showing_top_comparables", {
      count: 5,
      total: 20,
    });
    expect(text).toBe("Showing top 5 of 20 recent listings in snapshot:");
  });

  it("should format English plurals correctly", () => {
    const one = translate("en", "shelf_btn_send", { count: 1 });
    expect(one).toContain("Send 1 book");

    const many = translate("en", "shelf_btn_send", { count: 5 });
    expect(many).toContain("Send 5 books");
  });

  it("should format Czech plurals correctly according to 3-tier rules", () => {
    // 1 -> _one
    const one = translate("cs", "shelf_btn_send", { count: 1 });
    expect(one).toContain("Poslat 1 knihu");

    // 2 -> _few
    const fewTwo = translate("cs", "shelf_btn_send", { count: 2 });
    expect(fewTwo).toContain("Poslat 2 knihy");

    // 4 -> _few
    const fewFour = translate("cs", "shelf_btn_send", { count: 4 });
    expect(fewFour).toContain("Poslat 4 knihy");

    // 5 -> _many
    const manyFive = translate("cs", "shelf_btn_send", { count: 5 });
    expect(manyFive).toContain("Poslat 5 knih");

    // 0 -> _many
    const manyZero = translate("cs", "shelf_btn_send", { count: 0 });
    expect(manyZero).toContain("Poslat 0 knih");

    // 22 -> _many (Czech: 22 is outside 2-4 category, so it must fall back to many: "22 knih")
    const manyTwentyTwo = translate("cs", "shelf_btn_send", { count: 22 });
    expect(manyTwentyTwo).toContain("Poslat 22 knih");
  });

  it("should look up new dashboard date relative keys", () => {
    expect(translate("en", "dashboard_date_today")).toBe("today");
    expect(translate("cs", "dashboard_date_today")).toBe("dnes");

    expect(translate("en", "dashboard_date_days_ago", { count: 2 })).toBe(
      "2 days ago"
    );
    expect(translate("cs", "dashboard_date_days_ago", { count: 2 })).toBe(
      "před 2 dny"
    );
    expect(translate("cs", "dashboard_date_days_ago", { count: 5 })).toBe(
      "před 5 dny"
    );
  });

  it("should look up barcode and spine scanner keys", () => {
    expect(
      translate("en", "scanner_added_no_comparables", { isbn: "123" })
    ).toBe("Added: ISBN 123 (no comparables, see shelf)");
    expect(
      translate("cs", "scanner_added_no_comparables", { isbn: "123" })
    ).toBe("Přidáno: ISBN 123 (srovnatelné nabídky nenalezeny, viz police)");

    expect(translate("en", "scanner_found_cameras", { count: 3 })).toBe(
      "Found 3 cameras"
    );
    expect(translate("cs", "scanner_found_cameras", { count: 3 })).toBe(
      "Nalezeny 3 fotoaparáty"
    );
  });
});
