import { describe, expect, it, beforeEach, vi } from "vitest";
import { getShipments, addShipment } from "./seller-repository";

// Stub localStorage for Vitest Node environment (N2)
const storageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

// Stub globals before executing imports or testing
vi.stubGlobal("localStorage", storageMock);
vi.stubGlobal("window", {});

describe("seller-repository", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("should return empty list when running server-side (window undefined)", () => {
    // Temporarily remove window stub to simulate server-side environment
    vi.stubGlobal("window", undefined);
    
    const shipments = getShipments();
    expect(shipments).toEqual([]);
    
    // Restore window stub
    vi.stubGlobal("window", {});
  });

  it("should initialize localStorage with default mock shipments on first client call", () => {
    expect(localStorage.getItem("seller_shipments")).toBeNull();
    
    const shipments = getShipments();
    
    expect(shipments).toHaveLength(3);
    expect(shipments[0].id).toBe("KH-8942-A");
    expect(shipments[1].id).toBe("KH-7381-B");
    expect(shipments[2].id).toBe("KH-4102-C");
    
    // Check if it saved to localStorage
    const savedData = localStorage.getItem("seller_shipments");
    expect(savedData).not.toBeNull();
    expect(JSON.parse(savedData || "[]")).toHaveLength(3);
  });

  it("should add a new shipment successfully", () => {
    // Initialize
    getShipments();
    
    const newItems = [
      {
        title: "Test Book Title",
        author: "Test Author",
        condition: "good" as const,
        payoutCzk: 100,
      }
    ];
    
    const added = addShipment(newItems, 100, 150);
    
    expect(added.id).toMatch(/^KH-\d{4}-[A-Z]$/);
    expect(added.status).toBe("received");
    expect(added.expectedPayoutMin).toBe(100);
    expect(added.expectedPayoutMax).toBe(150);
    expect(added.items).toHaveLength(1);
    expect(added.items[0]).toEqual({
      title: "Test Book Title",
      author: "Test Author",
      isbn: undefined,
      condition: "good",
      status: "received",
    });
    
    // Fetch all shipments and verify the new one is first (descending date order)
    const list = getShipments();
    expect(list).toHaveLength(4);
    expect(list[0].id).toBe(added.id);
  });
});
