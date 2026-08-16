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
import { createSheetRow, updateSheetRow } from "@/lib/sheets.functions";

export type { Category, Customer, Enquiry, Product, Review, Seller, SellerStatus, Story };

export const ensureData = (force = false) => loadRemote(force);

let lastWriteError: string | null = null;
export const dataError = () => lastWriteError ?? remoteSnapshot().error;

const KEY = "nammaspot.store.v2";

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

const emptyOverlay: Overlay = {
  sellers: [], products: [], enquiries: [], reviews: [], customers: [],
  statusOverrides: {}, reviewApprovals: {}, productImages: {},
};

function readOverlay(): Overlay {
  if (typeof window === "undefined") return emptyOverlay;
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? { ...emptyOverlay, ...(JSON.parse(raw) as Overlay) } : emptyOverlay;
  } catch { return emptyOverlay; }
}
function writeOverlay(next: Overlay) {
  if (typeof window !== "undefined") window.localStorage.setItem(KEY, JSON.stringify(next));
}
function mutate(fn: (o: Overlay) => void) { const o = readOverlay(); fn(o); writeOverlay(o); }
function removeById<T extends { id: string }>(items: T[], id: string) { return items.filter((x) => x.id !== id); }
const id = (prefix: string) => `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;

function reportWriteError(err: unknown) { lastWriteError = err instanceof Error ? err.message : String(err); }
function clearWriteError() { lastWriteError = null; }

const mergeUnique = <T extends { id: string }>(remote: T[], local: T[]) => {
  const map = new Map<string, T>();
  for (const item of remote) map.set(item.id, item);
  for (const item of local) map.set(item.id, item);
  return [...map.values()];
};

export function allSellers(): Seller[] {
  const o = readOverlay();
  return mergeUnique(remoteSnapshot().sellers, o.sellers).map((s) => ({ ...s, status: o.statusOverrides[s.id] ?? s.status }));
}
export function allProducts(): Product[] {
  const o = readOverlay();
  return mergeUnique(remoteSnapshot().products, o.products).map((p) => ({ ...p, imageUrl: o.productImages[p.id] ?? p.imageUrl }));
}
export function allEnquiries(): Enquiry[] { return mergeUnique(remoteSnapshot().enquiries, readOverlay().enquiries); }
export function allReviews(): Review[] {
  const o = readOverlay();
  return mergeUnique(remoteSnapshot().reviews, o.reviews).map((r) => ({ ...r, approved: o.reviewApprovals[r.id] ?? r.approved }));
}
export function allCustomers(): Customer[] { return mergeUnique(remoteSnapshot().customers, readOverlay().customers); }
export const categories = (): Category[] => remoteSnapshot().categories;

export function stories(): Story[] {
  const sellers = approvedSellers();
  return sellers.length ? STORIES.map((st, i) => ({ ...st, sellerId: sellers[i % sellers.length]!.id })) : [];
}
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
export function areas() { return Array.from(new Set([...allSellers().flatMap((s) => [s.area, s.city]).filter(Boolean), ...BASE_AREAS])); }
export const AREAS = BASE_AREAS;

export interface SearchFilters { q?: string; category?: string; area?: string; minRating?: number; maxPrice?: number; sort?: "featured" | "rating" | "price-low" | "newest"; }
export function searchSellers(f: SearchFilters): Seller[] {
  const q = (f.q ?? "").trim().toLowerCase();
  const products = allProducts();
  let list = approvedSellers().filter((s) => {
    if (f.category && categoryById(s.categoryId)?.slug !== f.category) return false;
    if (f.area && s.area !== f.area && s.city !== f.area) return false;
    if (f.minRating && s.rating < f.minRating) return false;
    if (f.maxPrice && s.priceFrom > f.maxPrice) return false;
    if (!q) return true;
    return [s.businessName, s.ownerName, s.tagline, s.about, s.area, s.city, s.instagram, s.tags.join(" "), categoryById(s.categoryId)?.name ?? "", products.filter((p) => p.sellerId === s.id).map((p) => p.name).join(" ")].join(" ").toLowerCase().includes(q);
  });
  if (f.sort === "rating") list.sort((a, b) => b.rating - a.rating);
  else if (f.sort === "price-low") list.sort((a, b) => a.priceFrom - b.priceFrom);
  else if (f.sort === "newest") list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  else list.sort((a, b) => Number(b.featured) - Number(a.featured) || b.rating - a.rating);
  return list;
}

function createRemote(table: "sellers" | "products" | "customers" | "enquiries" | "reviews", row: Record<string, string | number | boolean | null>, rollback: () => void) {
  clearWriteError();
  void createSheetRow({ data: { table, row } }).then(() => clearWriteError()).catch((err) => { reportWriteError(err); rollback(); });
}
function updateRemote(table: "sellers" | "products" | "customers" | "enquiries" | "reviews", recordId: string, row: Record<string, string | number | boolean | null>, rollback: () => void) {
  clearWriteError();
  void updateSheetRow({ data: { table, id: recordId, row } }).then(() => clearWriteError()).catch((err) => { reportWriteError(err); rollback(); });
}

export function createEnquiry(input: Omit<Enquiry, "id" | "status" | "createdAt">): Enquiry {
  const enquiry: Enquiry = { ...input, id: id("e_"), status: "new", createdAt: new Date().toISOString().slice(0, 10) };
  const customerExists = allCustomers().some((c) => c.phone === input.phone);
  const customer = customerExists ? null : { id: id("cu_"), name: input.customerName, phone: input.phone, area: "—", createdAt: enquiry.createdAt };
  mutate((o) => { o.enquiries.unshift(enquiry); if (customer) o.customers.unshift(customer); });
  createRemote("enquiries", { enquiryId: enquiry.id, sellerId: enquiry.sellerId, productId: enquiry.productId ?? "", customerName: enquiry.customerName, phone: enquiry.phone, eventDate: enquiry.eventDate, message: enquiry.message, status: enquiry.status, createdAt: enquiry.createdAt }, () => mutate((o) => { o.enquiries = removeById(o.enquiries, enquiry.id); }));
  if (customer) createRemote("customers", { customerId: customer.id, name: customer.name, phone: customer.phone, area: customer.area, createdAt: customer.createdAt }, () => mutate((o) => { o.customers = removeById(o.customers, customer.id); }));
  return enquiry;
}

export function registerSeller(input: Pick<Seller, "businessName" | "ownerName" | "categoryId" | "area" | "city" | "instagram" | "whatsapp" | "email" | "tagline" | "about"> & { priceFrom: number }): Seller {
  const seller: Seller = { ...input, id: id("s_"), slug: input.businessName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""), rating: 0, reviewCount: 0, featured: false, status: "pending", createdAt: new Date().toISOString().slice(0, 10), deliversAcrossCity: true, tags: [] };
  mutate((o) => o.sellers.unshift(seller));
  createRemote("sellers", { sellerId: seller.id, name: seller.businessName, ownerName: seller.ownerName, category: categoryById(seller.categoryId)?.name ?? "", description: seller.about, tagline: seller.tagline, phone: seller.whatsapp, whatsapp: seller.whatsapp, instagram: `@${seller.instagram}`, email: seller.email, location: seller.area, city: seller.city, priceFrom: seller.priceFrom, status: seller.status, createdAt: seller.createdAt, imageUrl: "" }, () => mutate((o) => { o.sellers = removeById(o.sellers, seller.id); }));
  return seller;
}

export function restoreSellerProfile(seller: Seller) { if (!allSellers().some((s) => s.id === seller.id)) mutate((o) => o.sellers.unshift(seller)); }

export function addProduct(input: Omit<Product, "id" | "views" | "active">): Product {
  const product: Product = { ...input, id: id("p_"), views: 0, active: true };
  mutate((o) => o.products.unshift(product));
  createRemote("products", { productId: product.id, sellerId: product.sellerId, name: product.name, description: product.description, price: product.price, type: product.type, unit: product.unit, category: categoryById(sellerById(product.sellerId)?.categoryId ?? "")?.name ?? "", imageUrl: product.imageUrl ?? "" }, () => mutate((o) => { o.products = removeById(o.products, product.id); }));
  return product;
}

export function setSellerStatus(sellerId: string, status: SellerStatus) {
  const previous = allSellers().find((s) => s.id === sellerId)?.status;
  mutate((o) => { o.statusOverrides[sellerId] = status; });
  updateRemote("sellers", sellerId, { status }, () => mutate((o) => { if (previous) o.statusOverrides[sellerId] = previous; else delete o.statusOverrides[sellerId]; }));
}

export function setReviewApproval(reviewId: string, approved: boolean) {
  const previous = allReviews().find((r) => r.id === reviewId)?.approved;
  mutate((o) => { o.reviewApprovals[reviewId] = approved; });
  updateRemote("reviews", reviewId, { approved }, () => mutate((o) => { if (previous !== undefined) o.reviewApprovals[reviewId] = previous; else delete o.reviewApprovals[reviewId]; }));
}

export function setProductImage(productId: string, imageUrl: string) {
  mutate((o) => { o.productImages[productId] = imageUrl; });
  updateRemote("products", productId, { imageUrl }, () => mutate((o) => { delete o.productImages[productId]; }));
}
export function removeProductImage(productId: string) {
  const previous = allProducts().find((p) => p.id === productId)?.imageUrl ?? "";
  mutate((o) => { delete o.productImages[productId]; });
  updateRemote("products", productId, { imageUrl: "" }, () => { if (previous) mutate((o) => { o.productImages[productId] = previous; }); });
}

export const inr = (n: number) => `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
