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
import { appendSheetRow, updateSheetRow } from "@/lib/sheets.functions";

export type { Category, Customer, Enquiry, Product, Review, Seller, SellerStatus, Story };

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
  productImages: Record<string, string>;
}
const emptyOverlay: Overlay = { sellers: [], products: [], enquiries: [], reviews: [], customers: [], statusOverrides: {}, reviewApprovals: {}, productImages: {} };
function readOverlay(): Overlay {
  if (typeof window === "undefined") return emptyOverlay;
  try { return { ...emptyOverlay, ...(JSON.parse(window.localStorage.getItem(KEY) || "{}") as Overlay) }; } catch { return emptyOverlay; }
}
function writeOverlay(next: Overlay) { if (typeof window !== "undefined") window.localStorage.setItem(KEY, JSON.stringify(next)); }
function mutate(fn: (o: Overlay) => void) { const o = readOverlay(); fn(o); writeOverlay(o); }
const id = (prefix: string) => `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

function reportWrite(promise: Promise<{ ok: boolean; error?: string }>) {
  void promise.then((r) => { if (!r.ok) console.error("NammaSpot backend write failed:", r.error); });
}
function add(action: "addSeller" | "addProduct" | "addCustomer" | "addEnquiry" | "addReview", row: Record<string, string | number | boolean | null>) {
  reportWrite(appendSheetRow({ data: { action, row } }));
}
function update(action: "updateSeller" | "updateProduct" | "updateCustomer" | "updateEnquiry" | "updateReview", row: Record<string, string | number | boolean | null>) {
  reportWrite(updateSheetRow({ data: { action, row } }));
}

function mergeById<T extends { id: string }>(remote: T[], local: T[]): T[] {
  const map = new Map<string, T>();
  remote.forEach((x) => map.set(x.id, x));
  local.forEach((x) => map.set(x.id, { ...map.get(x.id), ...x } as T));
  return [...map.values()];
}

export function allSellers(): Seller[] {
  const o = readOverlay();
  return mergeById(remoteSnapshot().sellers, o.sellers).map((s) => ({ ...s, status: o.statusOverrides[s.id] ?? s.status }));
}
export function allProducts(): Product[] {
  const o = readOverlay();
  return mergeById(remoteSnapshot().products, o.products).map((p) => ({ ...p, imageUrl: o.productImages[p.id] ?? p.imageUrl }));
}
export function allEnquiries(): Enquiry[] { return mergeById(remoteSnapshot().enquiries, readOverlay().enquiries); }
export function allReviews(): Review[] { const o = readOverlay(); return mergeById(remoteSnapshot().reviews, o.reviews).map((r) => ({ ...r, approved: o.reviewApprovals[r.id] ?? r.approved })); }
export function allCustomers(): Customer[] { return mergeById(remoteSnapshot().customers, readOverlay().customers); }
export const categories = (): Category[] => remoteSnapshot().categories;
export function stories(): Story[] { const sellers = approvedSellers(); return sellers.length ? STORIES.map((st, i) => ({ ...st, sellerId: sellers[i % sellers.length]!.id })) : []; }
export const approvedSellers = () => allSellers().filter((s) => s.status === "approved");
export const sellerBySlug = (slug: string) => allSellers().find((s) => s.slug === slug);
export const sellerById = (sid: string) => allSellers().find((s) => s.id === sid);
export const categoryById = (cid: string) => categories().find((c) => c.id === cid);
export const categoryBySlug = (slug: string) => categories().find((c) => c.slug === slug);
export const productsBySeller = (sid: string) => allProducts().filter((p) => p.sellerId === sid && p.active);
export const reviewsBySeller = (sid: string) => allReviews().filter((r) => r.sellerId === sid && r.approved);
export const enquiriesBySeller = (sid: string) => allEnquiries().filter((e) => e.sellerId === sid);
export const storiesBySeller = (sid: string) => stories().filter((s) => s.sellerId === sid);

const BASE_AREAS = ["Mylapore", "Adyar", "Besant Nagar", "T Nagar", "Anna Nagar", "Velachery", "Kodambakkam", "Villivakkam", "Tambaram", "Coimbatore", "Madurai"];
export function areas(): string[] { return Array.from(new Set([...allSellers().flatMap((s) => [s.area, s.city]).filter(Boolean), ...BASE_AREAS])); }
export const AREAS = BASE_AREAS;
export interface SearchFilters { q?: string; category?: string; area?: string; minRating?: number; maxPrice?: number; sort?: "featured" | "rating" | "price-low" | "newest"; }
export function searchSellers(f: SearchFilters): Seller[] {
  const q = (f.q ?? "").trim().toLowerCase();
  let list = approvedSellers().filter((s) => {
    if (f.category && categoryById(s.categoryId)?.slug !== f.category) return false;
    if (f.area && s.area !== f.area && s.city !== f.area) return false;
    if (f.minRating && s.rating < f.minRating) return false;
    if (f.maxPrice && s.priceFrom > f.maxPrice) return false;
    if (!q) return true;
    return [s.businessName, s.ownerName, s.tagline, s.about, s.area, s.city, s.instagram, s.tags.join(" "), categoryById(s.categoryId)?.name ?? "", ...allProducts().filter((p) => p.sellerId === s.id).map((p) => p.name)].join(" ").toLowerCase().includes(q);
  });
  if (f.sort === "rating") list.sort((a, b) => b.rating - a.rating);
  else if (f.sort === "price-low") list.sort((a, b) => a.priceFrom - b.priceFrom);
  else if (f.sort === "newest") list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  else list.sort((a, b) => Number(b.featured) - Number(a.featured) || b.rating - a.rating);
  return list;
}

export function createEnquiry(input: Omit<Enquiry, "id" | "status" | "createdAt">): Enquiry {
  const enquiry: Enquiry = { ...input, id: id("e_"), status: "new", createdAt: new Date().toISOString().slice(0, 10) };
  const existingCustomer = allCustomers().find((c) => c.phone.replace(/\D/g, "") === input.phone.replace(/\D/g, ""));
  const customer = existingCustomer ?? { id: id("cu_"), name: input.customerName, phone: input.phone, area: "—", createdAt: enquiry.createdAt };
  mutate((o) => { o.enquiries.unshift(enquiry); if (!existingCustomer) o.customers.unshift(customer); });
  if (!existingCustomer) add("addCustomer", { customerId: customer.id, name: customer.name, phone: customer.phone, area: customer.area, createdAt: customer.createdAt });
  add("addEnquiry", { enquiryId: enquiry.id, sellerId: enquiry.sellerId, productId: enquiry.productId ?? "", customerName: enquiry.customerName, phone: enquiry.phone, eventDate: enquiry.eventDate, message: enquiry.message, status: enquiry.status, createdAt: enquiry.createdAt });
  return enquiry;
}

export function registerSeller(input: Pick<Seller, "businessName" | "ownerName" | "categoryId" | "area" | "city" | "instagram" | "whatsapp" | "email" | "tagline" | "about"> & { priceFrom: number }): Seller {
  const seller: Seller = { ...input, id: id("s_"), slug: input.businessName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""), rating: 0, reviewCount: 0, featured: false, status: "pending", createdAt: new Date().toISOString().slice(0, 10), deliversAcrossCity: true, tags: [] };
  mutate((o) => o.sellers.unshift(seller));
  add("addSeller", { sellerId: seller.id, name: seller.businessName, ownerName: seller.ownerName, category: categoryById(seller.categoryId)?.name ?? "", description: seller.about, tagline: seller.tagline, phone: seller.whatsapp, whatsapp: seller.whatsapp, instagram: `@${seller.instagram}`, email: seller.email, location: seller.area, city: seller.city, priceFrom: seller.priceFrom, status: seller.status, createdAt: seller.createdAt, imageUrl: seller.imageUrl ?? "" });
  return seller;
}

export function restoreSellerProfile(seller: Seller) { if (!allSellers().some((s) => s.id === seller.id)) mutate((o) => o.sellers.unshift(seller)); }

export function addProduct(input: Omit<Product, "id" | "views" | "active">): Product {
  const product: Product = { ...input, id: id("p_"), views: 0, active: true };
  mutate((o) => { o.products.unshift(product); if (product.imageUrl) o.productImages[product.id] = product.imageUrl; });
  add("addProduct", { productId: product.id, sellerId: product.sellerId, name: product.name, description: product.description, price: product.price, type: product.type, unit: product.unit, category: categoryById(sellerById(product.sellerId)?.categoryId ?? "")?.name ?? "", imageUrl: product.imageUrl ?? "" });
  return product;
}

export function setSellerStatus(sellerId: string, status: SellerStatus) {
  const seller = sellerById(sellerId); if (!seller) return;
  mutate((o) => { o.statusOverrides[sellerId] = status; });
  update("updateSeller", { sellerId, status });
}

export function setReviewApproval(reviewId: string, approved: boolean) {
  mutate((o) => { o.reviewApprovals[reviewId] = approved; });
  update("updateReview", { reviewId, approved });
}

export function setSellerImage(sellerId: string, imageUrl: string) {
  const seller = sellerById(sellerId); if (!seller) return;
  const next = { ...seller, imageUrl };
  mutate((o) => { const i = o.sellers.findIndex((s) => s.id === sellerId); if (i >= 0) o.sellers[i] = next; else o.sellers.unshift(next); });
  update("updateSeller", { sellerId, imageUrl });
}

export function setProductImage(productId: string, imageUrl: string) {
  mutate((o) => { o.productImages[productId] = imageUrl; });
  update("updateProduct", { productId, imageUrl });
}
export function removeProductImage(productId: string) {
  mutate((o) => { delete o.productImages[productId]; });
  update("updateProduct", { productId, imageUrl: "" });
}

export const inr = (n: number) => `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
