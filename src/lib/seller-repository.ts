export type ShipmentStatus = "received" | "priced" | "listed" | "sold" | "paid";

export interface ShipmentItem {
  title: string;
  author: string;
  isbn?: string;
  condition: "new" | "verygood" | "good" | "worn";
  status: ShipmentStatus;
  listPriceCzk?: number;
  payoutCzk?: number;
  soldAt?: string; // ISO String
  paidAt?: string; // ISO String
}

export interface Shipment {
  id: string;
  dateSent: string; // ISO String
  carrier: string;
  trackingNumber: string;
  status: ShipmentStatus;
  items: ShipmentItem[];
  expectedPayoutMin: number;
  expectedPayoutMax: number;
}

const STORAGE_KEY = "seller_shipments";

// Helper to generate dynamic mock shipments relative to current time
export function generateMockShipments(): Shipment[] {
  const now = new Date();

  // Date calculations
  const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
  const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
  const fourDaysAgo = new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000);
  const fortyFiveDaysAgo = new Date(now.getTime() - 45 * 24 * 60 * 60 * 1000);
  const thirtySevenDaysAgo = new Date(now.getTime() - 37 * 24 * 60 * 60 * 1000);
  const thirtyThreeDaysAgo = new Date(now.getTime() - 33 * 24 * 60 * 60 * 1000);

  // Knihobot payouts occur on the 10th of the month following the sale (after return period)
  // For Shipment 3, we set paidAt to 10 days ago
  const tenDaysAgo = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000);

  return [
    {
      id: "KH-8942-A",
      dateSent: twoDaysAgo.toISOString(),
      carrier: "Zásilkovna (Packeta)",
      trackingNumber: "Z-492-938-12",
      status: "priced",
      expectedPayoutMin: 61,
      expectedPayoutMax: 85,
      items: [
        {
          title: "Tajemství",
          author: "Rhonda Byrne",
          condition: "good",
          status: "priced",
          listPriceCzk: 150,
          payoutCzk: 61,
        },
        {
          title: "Dívka ve vlaku",
          author: "Paula Hawkins",
          condition: "good",
          status: "received",
        },
      ],
    },
    {
      id: "KH-7381-B",
      dateSent: fourteenDaysAgo.toISOString(),
      carrier: "Knihobot Courier",
      trackingNumber: "KH-C-8329",
      status: "sold",
      expectedPayoutMin: 194,
      expectedPayoutMax: 260,
      items: [
        {
          title: "Gump. Pes, který naučil lidi žít",
          author: "Filip Rožek",
          condition: "verygood",
          status: "sold",
          listPriceCzk: 180,
          payoutCzk: 79,
          soldAt: fourDaysAgo.toISOString(),
        },
        {
          title: "15 roků lásky",
          author: "Patrik Hartl",
          condition: "good",
          status: "listed",
          listPriceCzk: 240,
          payoutCzk: 115,
        },
      ],
    },
    {
      id: "KH-4102-C",
      dateSent: fortyFiveDaysAgo.toISOString(),
      carrier: "Handed over in Karlín branch",
      trackingNumber: "In-Person Direct",
      status: "paid",
      expectedPayoutMin: 86,
      expectedPayoutMax: 110,
      items: [
        {
          title: "Dívka ve vlaku",
          author: "Paula Hawkins",
          condition: "worn",
          status: "paid",
          listPriceCzk: 100,
          payoutCzk: 31,
          soldAt: thirtySevenDaysAgo.toISOString(),
          paidAt: tenDaysAgo.toISOString(),
        },
        {
          title: "Tajemství",
          author: "Rhonda Byrne",
          condition: "good",
          status: "paid",
          listPriceCzk: 140,
          payoutCzk: 55,
          soldAt: thirtyThreeDaysAgo.toISOString(),
          paidAt: tenDaysAgo.toISOString(),
        },
      ],
    },
  ];
}

// Client-safe retrieval to prevent SSR hydration mismatches (B2)
export function getShipments(): Shipment[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) {
      const defaultMock = generateMockShipments();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultMock));
      return defaultMock;
    }
    return JSON.parse(data);
  } catch (err) {
    console.error("Failed to load shipments from localStorage", err);
    return [];
  }
}

// Adds a new shipment from shelf items (B1)
export function addShipment(
  items: {
    title: string;
    author: string;
    isbn?: string;
    condition: "new" | "verygood" | "good" | "worn";
    payoutCzk: number;
  }[],
  expectedPayoutMin: number,
  expectedPayoutMax: number
): Shipment {
  if (typeof window === "undefined") {
    throw new Error("Cannot add shipment on server-side context");
  }

  const currentShipments = getShipments();
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  const nextLetter = String.fromCharCode(65 + (currentShipments.length % 26));
  const newId = `KH-${randomSuffix}-${nextLetter}`;

  const shipmentItems: ShipmentItem[] = items.map((item) => ({
    title: item.title,
    author: item.author,
    isbn: item.isbn,
    condition: item.condition,
    status: "received",
  }));

  const newShipment: Shipment = {
    id: newId,
    dateSent: new Date().toISOString(),
    carrier: "Zásilkovna (Packeta)",
    trackingNumber: `Z-DEMO-${Math.floor(100000 + Math.random() * 900000)}`,
    status: "received",
    expectedPayoutMin,
    expectedPayoutMax,
    items: shipmentItems,
  };

  const updated = [newShipment, ...currentShipments];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  return newShipment;
}
