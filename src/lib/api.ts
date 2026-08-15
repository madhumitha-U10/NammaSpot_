/**
 * NammaSpot data access layer (the only place the app talks to "the backend").
 *
 * Reads: live Google Sheets data through the Apps Script Web App
 * (src/lib/sheets.functions.ts -> src/lib/remote.ts).
 * Writes: applied instantly to a localStorage overlay so the UI stays snappy,
 * and mirrored to the sheet best-effort via `appendSheetRow` (which starts
 * working the moment doPost exists in the Apps Script — see backend/Code.gs).
 */

import {
  STORIES,
  type Category,
  type Customer,
  type Enquiry,
  type Product,
  type Review,
  type Seller,
  type SellerStatus,
  type Story,
} from "@/data/seed";
import { loadRemote, remoteSnapshot } from "@/lib/remote";
import { appendSheetRow } from "@/lib/sheets.functions";

export type {
  Category,
  Customer,
  Enquiry,
  Product,
  Review,
  Seller,
  SellerStatus,
  Story,
};

/** Loads Sellers/Products/Categories (and the prepared Customers/Enquiries/
 * Reviews tables) from the Google Sheets backend. Safe to call repeatedly. */
export const ensureData = (force = false) => loadRemote(force);
export const dataError = () => remoteSnapshot().error;

const KEY = "nammaspot.store.v1";

interface Overlay {
  sellers: Seller[];
  products: Product[];
  enquiries: Enquiry[];
  reviews: Review[];
  customers: Customer[];
  statusOverrides: Record<string, SellerStatus>;
  reviewApprovals: Record<string, boolean>;
  /** productId -> uploaded catalogue photo (data URL). */
  productImages: Record<string, string>;
  /** customerId -> uploaded profile picture (data URL). */
  customerAvatars: Record<string, string>;
}

const emptyOverlay: Overlay = {
  sellers: [],
  products: [],
  enquiries: [],
  reviews: [],
  customers: [],
  statusOverrides: {},
  reviewApprovals: {},
  productImages: {},
  customerAvatars: {},
};

function readOverlay(): Overlay {
  if (typeof window === "undefined") return emptyOverlay;
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? { ...emptyOverlay, ...(JSON.parse(raw) as Overlay) } : emptyOverlay;
  } catch {
    return emptyOverlay;
  }
}

function writeOverlay(next: Overlay) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(next));
}

function mutate(fn: (o: Overlay) => void) {
  const o = readOverlay();
  fn(o);
  writeOverlay(o);
}

const id = (prefix: string) => `${prefix}${Date.now().toString(36)}`;

/** Mirror a write to Google Sheets. Never blocks or breaks the UI. */
function mirror(
  action: "addSeller" | "addProduct" | "addCustomer" | "addEnquiry" | "addReview",
  row: Record<string, string | number | boolean | null>,
) {
  void appendSheetRow({ data: { action, row } }).catch(() => undefined);
}

/* ---------------------------------- reads --------------------------------- */

export function allSellers(): Seller[] {
  const o = readOverlay();
  return [...remoteSnapshot().sellers, ...o.sellers].map((s) => ({
    ...s,
    status: o.statusOverrides[s.id] ?? s.status,
  }));
}

export function allProducts(): Product[] {
  const o = readOverlay();
  return [...remoteSnapshot().products, ...o.products].map((p) => ({
    ...p,
    imageUrl: o.productImages[p.id] ?? p.imageUrl,
  }));
}

export function allEnquiries(): Enquiry[] {
  return [...readOverlay().enquiries, ...remoteSnapshot().enquiries];
}

export function allReviews(): Review[] {
  const o = readOverlay();
  return [...remoteSnapshot().reviews, ...o.reviews].map((r) => ({
    ...r,
    approved: o.reviewApprovals[r.id] ?? r.approved,
  }));
}

export function allCustomers(): Customer[] {
  const o = readOverlay();
  return [...remoteSnapshot().customers, ...o.customers].map((c) => ({
    ...c,
    avatarUrl: o.customerAvatars[c.id] ?? c.avatarUrl,
  }));
}

export const categories = (): Category[] => remoteSnapshot().categories;

/** Stories are editorial content (no sheet tab yet) — attached to live sellers. */
export function stories(): Story[] {
  const sellers = approvedSellers();
  if (!sellers.length) return [];
  return STORIES.map((st, i) => ({ ...st, sellerId: sellers[i % sellers.length]!.id }));
}

export const approvedSellers = () => allSellers().filter((s) => s.status === "approved");

export const sellerBySlug = (slug: string) => allSellers().find((s) => s.slug === slug);
export const sellerById = (sid: string) => allSellers().find((s) => s.id === sid);
export const categoryById = (cid: string) => categories().find((c) => c.id === cid);
export const categoryBySlug = (slug: string) => categories().find((c) => c.slug === slug);
export const productsBySeller = (sid: string) =>
  allProducts().filter((p) => p.sellerId === sid && p.active);
export const reviewsBySeller = (sid: string) =>
  allReviews().filter((r) => r.sellerId === sid && r.approved);
export const enquiriesBySeller = (sid: string) =>
  allEnquiries().filter((e) => e.sellerId === sid);
export const storiesBySeller = (sid: string) => stories().filter((s) => s.sellerId === sid);

const BASE_AREAS = [
  "Mylapore", "Adyar", "Besant Nagar", "T Nagar", "Anna Nagar", "Velachery",
  "Kodambakkam", "Villivakkam", "Tambaram", "Coimbatore", "Madurai",
];

/** Areas from live seller data, merged with the known Chennai/TN list. */
export function areas(): string[] {
  const live = allSellers().flatMap((s) => [s.area, s.city]).filter(Boolean);
  return Array.from(new Set([...live, ...BASE_AREAS]));
}

export const AREAS = BASE_AREAS;

export interface SearchFilters {
  q?: string | undefined;
  category?: string | undefined;
  area?: string | undefined;
  minRating?: number | undefined;
  maxPrice?: number | undefined;
  sort?: "featured" | "rating" | "price-low" | "newest" | undefined;
}

export function searchSellers(f: SearchFilters): Seller[] {
  const q = (f.q ?? "").trim().toLowerCase();
  const products = allProducts();

  let list = approvedSellers().filter((s) => {
    if (f.category && categoryById(s.categoryId)?.slug !== f.category) return false;
    if (f.area && s.area !== f.area && s.city !== f.area) return false;
    if (f.minRating && s.rating < f.minRating) return false;
    if (f.maxPrice && s.priceFrom > f.maxPrice) return false;
    if (!q) return true;
    const hay = [
      s.businessName, s.ownerName, s.tagline, s.about, s.area, s.city,
      s.instagram, s.tags.join(" "), categoryById(s.categoryId)?.name ?? "",
      products.filter((p) => p.sellerId === s.id).map((p) => p.name).join(" "),
    ].join(" ").toLowerCase();
    return hay.includes(q);
  });

  switch (f.sort) {
    case "rating":
      list = list.sort((a, b) => b.rating - a.rating);
      break;
    case "price-low":
      list = list.sort((a, b) => a.priceFrom - b.priceFrom);
      break;
    case "newest":
      list = list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      break;
    default:
      list = list.sort(
        (a, b) => Number(b.featured) - Number(a.featured) || b.rating - a.rating,
      );
  }
  return list;
}

/* --------------------------------- writes --------------------------------- */

export function createEnquiry(input: Omit<Enquiry, "id" | "status" | "createdAt">): Enquiry {
  const enquiry: Enquiry = {
    ...input,
    id: id("e_"),
    status: "new",
    createdAt: new Date().toISOString().slice(0, 10),
  };
  mutate((o) => {
    o.enquiries.unshift(enquiry);
    if (!allCustomers().some((c) => c.phone === input.phone)) {
      o.customers.unshift({
        id: id("cu_"),
        name: input.customerName,
        phone: input.phone,
        area: "—",
        createdAt: enquiry.createdAt,
      });
    }
  });
  mirror("addEnquiry", {
    enquiryId: enquiry.id,
    sellerId: enquiry.sellerId,
    productId: enquiry.productId ?? "",
    customerName: enquiry.customerName,
    phone: enquiry.phone,
    eventDate: enquiry.eventDate,
    message: enquiry.message,
    status: enquiry.status,
    createdAt: enquiry.createdAt,
  });
  return enquiry;
}

export function registerSeller(
  input: Pick<Seller, "businessName" | "ownerName" | "categoryId" | "area" | "city" | "instagram" | "whatsapp" | "email" | "tagline" | "about"> & { priceFrom: number },
): Seller {
  const seller: Seller = {
    ...input,
    id: id("s_"),
    slug: input.businessName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
    rating: 0,
    reviewCount: 0,
    featured: false,
    status: "pending",
    createdAt: new Date().toISOString().slice(0, 10),
    deliversAcrossCity: true,
    tags: [],
  };
  mutate((o) => o.sellers.unshift(seller));
  mirror("addSeller", {
    sellerId: seller.id,
    name: seller.businessName,
    ownerName: seller.ownerName,
    category: categoryById(seller.categoryId)?.name ?? "",
    description: seller.about,
    tagline: seller.tagline,
    phone: seller.whatsapp,
    whatsapp: seller.whatsapp,
    instagram: `@${seller.instagram}`,
    email: seller.email,
    location: seller.area,
    city: seller.city,
    priceFrom: seller.priceFrom,
    status: seller.status,
    createdAt: seller.createdAt,
    imageUrl: "",
  });
  return seller;
}

export function addProduct(input: Omit<Product, "id" | "views" | "active">): Product {
  const product: Product = { ...input, id: id("p_"), views: 0, active: true };
  const { imageUrl, ...rest } = product;
  mutate((o) => {
    o.products.unshift(rest as Product);
    if (imageUrl) o.productImages[product.id] = imageUrl;
  });
  mirror("addProduct", {
    productId: product.id,
    sellerId: product.sellerId,
    name: product.name,
    description: product.description,
    price: product.price,
    type: product.type,
    unit: product.unit,
    category: categoryById(sellerById(product.sellerId)?.categoryId ?? "")?.name ?? "",
    // Only mirror hosted URLs to the sheet; uploaded photos stay in the local overlay.
    imageUrl: imageUrl && /^https?:/i.test(imageUrl) ? imageUrl : "",
  });
  return product;
}

export function setSellerStatus(sellerId: string, status: SellerStatus) {
  mutate((o) => {
    o.statusOverrides[sellerId] = status;
  });
}

export function setReviewApproval(reviewId: string, approved: boolean) {
  mutate((o) => {
    o.reviewApprovals[reviewId] = approved;
  });
}

/** Attach / change a catalogue photo for an existing product. */
export function setProductImage(productId: string, dataUrl: string) {
  mutate((o) => {
    o.productImages[productId] = dataUrl;
  });
}

export function removeProductImage(productId: string) {
  mutate((o) => {
    delete o.productImages[productId];
  });
}

/** Attach / change a customer profile picture (optional). */
export function setCustomerAvatar(customerId: string, dataUrl: string) {
  mutate((o) => {
    o.customerAvatars[customerId] = dataUrl;
  });
}

export function removeCustomerAvatar(customerId: string) {
  mutate((o) => {
    delete o.customerAvatars[customerId];
  });
}

export const inr = (n: number) =>
  `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
