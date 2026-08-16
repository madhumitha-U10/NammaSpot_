/**
 * NammaSpot seed data.
 *
 * This mirrors the Google Sheets schema exactly (one array = one sheet/tab).
 */

export type SellerStatus = "pending" | "approved" | "rejected";

export interface Category { id: string; name: string; tamilName: string; slug: string; blurb: string; }

export interface Seller {
  id: string; slug: string; businessName: string; ownerName: string; categoryId: string;
  tagline: string; about: string; area: string; city: string; instagram: string;
  whatsapp: string; email: string; rating: number; reviewCount: number; priceFrom: number;
  featured: boolean; status: SellerStatus; createdAt: string; deliversAcrossCity: boolean;
  tags: string[]; imageUrl?: string | undefined;
}

export interface Product { id: string; sellerId: string; name: string; type: "product" | "service"; price: number; unit: string; description: string; views: number; active: boolean; imageUrl?: string | undefined; }

export interface Customer { id: string; name: string; phone: string; area: string; createdAt: string; }
export interface Enquiry { id: string; sellerId: string; productId: string | null; customerName: string; phone: string; eventDate: string; message: string; status: "new" | "responded" | "closed"; createdAt: string; }
export interface Review { id: string; sellerId: string; customerName: string; rating: number; comment: string; createdAt: string; approved: boolean; }
export interface Story { id: string; sellerId: string; title: string; excerpt: string; body: string; }

export const CATEGORIES: Category[] = [
  { id: "c1", name: "Home Bakers", tamilName: "வீட்டு பேக்கிங்", slug: "home-bakers", blurb: "Custom cakes, brownies and teatime bakes from home kitchens." },
  { id: "c2", name: "Mehendi Artists", tamilName: "மருதாணி", slug: "mehendi", blurb: "Bridal and festive henna, booked directly with the artist." },
  { id: "c3", name: "Makeup & Bridal", tamilName: "மேக்கப்", slug: "makeup-bridal", blurb: "Muhurtham, reception and engagement styling." },
  { id: "c4", name: "Crochet & Knits", tamilName: "கிரோஷே", slug: "crochet", blurb: "Handmade amigurumi, bags and slow-made softies." },
  { id: "c5", name: "Artists & Prints", tamilName: "ஓவியம்", slug: "artists", blurb: "Portraits, Tanjore-inspired work and city prints." },
];

export const STORIES: Story[] = [];
