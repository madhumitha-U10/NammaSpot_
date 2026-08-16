import "@/data/seed";

declare module "@/data/seed" {
  interface Seller {
    /** Persistent seller/business profile photo stored in the Sellers sheet. */
    imageUrl?: string | undefined;
  }
}
