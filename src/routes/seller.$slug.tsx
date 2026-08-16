import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { CalendarDays, Instagram, MapPin, MessageCircle, Phone, Share2, Truck } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

import { Rating } from "@/components/site/Rating";
import { SiteShell } from "@/components/site/SiteShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { SELLERS } from "@/data/seed";
import { useStoreData } from "@/hooks/use-store-data";
import { categoryById, createEnquiry, inr, productsBySeller, reviewsBySeller, sellerBySlug, storiesBySeller } from "@/lib/api";
import { createReview } from "@/lib/reviews";
import { imageForCategorySlug } from "@/lib/images";

export const Route = createFileRoute("/seller/$slug")({
  loader: ({ params }) => ({ seedSeller: SELLERS.find((s) => s.slug === params.slug) ?? null }),
  head: ({ params }) => {
    const seller = SELLERS.find((s) => s.slug === params.slug);
    const title = seller ? `${seller.businessName} — ${seller.area}, Chennai | NammaSpot` : "Seller — NammaSpot";
    const description = seller ? `${seller.tagline}. View the catalogue, reviews and send an enquiry to ${seller.businessName} in ${seller.area}.` : "Seller profile on NammaSpot.";
    return { meta: [{ title }, { name: "description", content: description }, { property: "og:title", content: title }, { property: "og:description", content: description }] };
  },
  notFoundComponent: () => (
    <SiteShell><div className="mx-auto max-w-xl px-4 py-24 text-center"><h1 className="text-2xl font-extrabold">Seller not found</h1><p className="mt-2 text-sm text-muted-foreground">This profile may have been removed or is awaiting approval.</p><Button asChild className="mt-6 rounded-full"><Link to="/explore">Back to explore</Link></Button></div></SiteShell>
  ),
  component: SellerProfile,
});

const enquirySchema = z.object({
  customerName: z.string().trim().min(2, "Please enter your name").max(80),
  phone: z.string().trim().regex(/^[0-9+\s-]{10,15}$/, "Enter a valid phone number"),
  eventDate: z.string().max(20),
  message: z.string().trim().min(10, "Tell the seller a bit more").max(1000),
});

const reviewSchema = z.object({
  customerName: z.string().trim().min(2, "Please enter your name").max(80),
  rating: z.coerce.number().int().min(1).max(5),
  comment: z.string().trim().min(10, "Please share a little more detail").max(1000),
});

function SellerProfile() {
  const { slug } = Route.useParams();
  const { seedSeller } = Route.useLoaderData();
  const { data: resolved } = useStoreData(() => ({ seller: sellerBySlug(slug) ?? null }));
  const seller = resolved ? resolved.seller : seedSeller;
  const { data: products } = useStoreData(() => { const s = sellerBySlug(slug); return s ? productsBySeller(s.id) : []; });
  const { data: reviews, refresh: refreshReviews } = useStoreData(() => { const s = sellerBySlug(slug); return s ? reviewsBySeller(s.id) : []; });
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);

  if (resolved && resolved.seller === null) throw notFound();
  if (!seller) return <SiteShell><div className="mx-auto max-w-6xl px-4 py-24 text-sm text-muted-foreground">Loading profile…</div></SiteShell>;

  const category = categoryById(seller.categoryId);
  const story = storiesBySeller(seller.id)[0];
  const share = async () => {
    const url = window.location.href;
    if (navigator.share) { try { await navigator.share({ title: seller.businessName, url }); return; } catch { /* cancelled */ } }
    await navigator.clipboard.writeText(url); toast.success("Profile link copied");
  };

  return (
    <SiteShell>
      <div className="relative border-b border-border bg-card">
        <img src={imageForCategorySlug(category?.slug)} alt={seller.businessName} className="h-40 w-full object-cover sm:h-56" />
        <div className="mx-auto max-w-6xl px-4 pb-6 lg:px-6">
          <div className="-mt-10 grid grid-cols-[minmax(0,1fr)_auto] items-end gap-4">
            <div className="min-w-0"><Badge className="mb-2">{category?.name}</Badge><h1 className="text-2xl font-extrabold sm:text-3xl">{seller.businessName}</h1><p className="mt-1 text-sm text-muted-foreground">{seller.tagline}</p><div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground"><Rating value={seller.rating} count={seller.reviewCount} /><span className="inline-flex items-center gap-1"><MapPin className="size-3.5" /> {seller.area}, {seller.city}</span><a href={`https://instagram.com/${seller.instagram}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:text-primary"><Instagram className="size-3.5" /> @{seller.instagram}</a>{seller.deliversAcrossCity && <span className="inline-flex items-center gap-1"><Truck className="size-3.5" /> Delivers city-wide</span>}</div></div>
            <Button variant="outline" size="icon" onClick={share} aria-label="Share profile"><Share2 className="size-4" /></Button>
          </div>
          <div className="mt-5 flex flex-wrap gap-2"><Button asChild className="rounded-full"><a href={`https://wa.me/${seller.whatsapp}`} target="_blank" rel="noreferrer"><MessageCircle className="size-4" /> WhatsApp</a></Button><Button asChild variant="outline" className="rounded-full"><a href={`tel:+${seller.whatsapp}`}><Phone className="size-4" /> Call</a></Button><Button asChild variant="outline" className="rounded-full"><a href="#enquiry"><CalendarDays className="size-4" /> Send enquiry</a></Button></div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-8 lg:px-6">
        <Tabs defaultValue="catalogue"><TabsList><TabsTrigger value="catalogue">Catalogue</TabsTrigger><TabsTrigger value="about">About</TabsTrigger><TabsTrigger value="reviews">Reviews ({reviews?.length ?? 0})</TabsTrigger></TabsList>
          <TabsContent value="catalogue" className="mt-6"><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{(products ?? []).map((p) => (
            <div key={p.id} className="card-soft flex flex-col p-4">
              {p.imageUrl && <div className="-mx-4 -mt-4 mb-3 flex aspect-[4/5] items-center justify-center overflow-hidden bg-secondary"><img src={p.imageUrl} alt={p.name} loading="lazy" className="h-full w-full object-contain" /></div>}
              <div className="flex items-start justify-between gap-2"><h3 className="min-w-0 text-sm font-bold">{p.name}</h3><Badge variant="secondary" className="shrink-0 text-[10px] uppercase">{p.type}</Badge></div>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{p.description}</p>
              <div className="mt-4 flex items-center justify-between gap-2"><p className="text-sm font-bold text-primary">{inr(p.price)} <span className="text-xs font-normal text-muted-foreground">/ {p.unit}</span></p><Button size="sm" variant="outline" className="rounded-full" onClick={() => { setSelectedProduct(p.id); document.getElementById("enquiry")?.scrollIntoView({ behavior: "smooth" }); }}>Enquire</Button></div>
            </div>
          ))}</div></TabsContent>
          <TabsContent value="about" className="mt-6 max-w-2xl"><p className="text-sm leading-relaxed text-muted-foreground">{seller.about}</p><div className="mt-4 flex flex-wrap gap-2">{seller.tags.map((t) => <Badge key={t} variant="secondary">{t}</Badge>)}</div><dl className="mt-6 grid gap-3 sm:grid-cols-2"><div className="card-soft p-4"><dt className="text-xs uppercase tracking-widest text-muted-foreground">Owner</dt><dd className="mt-1 text-sm font-semibold">{seller.ownerName}</dd></div><div className="card-soft p-4"><dt className="text-xs uppercase tracking-widest text-muted-foreground">Starts from</dt><dd className="mt-1 text-sm font-semibold">{inr(seller.priceFrom)}</dd></div><div className="card-soft p-4"><dt className="text-xs uppercase tracking-widest text-muted-foreground">Email</dt><dd className="mt-1 break-all text-sm font-semibold">{seller.email}</dd></div><div className="card-soft p-4"><dt className="text-xs uppercase tracking-widest text-muted-foreground">On NammaSpot since</dt><dd className="mt-1 text-sm font-semibold">{seller.createdAt}</dd></div></dl>{story && <div className="card-soft mt-6 p-5"><h3 className="text-base font-bold">{story.title}</h3><p className="mt-2 text-sm leading-relaxed text-muted-foreground">{story.body}</p></div>}</TabsContent>
          <TabsContent value="reviews" className="mt-6 max-w-2xl space-y-3">
            {(reviews ?? []).length === 0 && <p className="text-sm text-muted-foreground">No reviews published yet.</p>}
            {(reviews ?? []).map((r) => <div key={r.id} className="card-soft p-4"><div className="flex items-center justify-between gap-3"><p className="text-sm font-semibold">{r.customerName}</p><Rating value={r.rating} /></div><p className="mt-2 text-sm text-muted-foreground">{r.comment}</p><p className="mt-2 text-xs text-muted-foreground">{r.createdAt}</p></div>)}
            <ReviewForm sellerId={seller.id} onSubmitted={refreshReviews} />
          </TabsContent>
        </Tabs>
        <EnquiryForm sellerId={seller.id} productId={selectedProduct} productName={(products ?? []).find((p) => p.id === selectedProduct)?.name} />
      </div>
    </SiteShell>
  );
}

function EnquiryForm({ sellerId, productId, productName }: { sellerId: string; productId: string | null; productName?: string | undefined }) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (submitting) return;
    const form = e.currentTarget;
    const fd = new FormData(form);
    const parsed = enquirySchema.safeParse({ customerName: String(fd.get("customerName") ?? ""), phone: String(fd.get("phone") ?? ""), eventDate: String(fd.get("eventDate") ?? ""), message: String(fd.get("message") ?? "") });
    if (!parsed.success) { const next: Record<string, string> = {}; for (const issue of parsed.error.issues) next[String(issue.path[0])] = issue.message; setErrors(next); return; }
    setErrors({}); setSubmitting(true);
    try {
      createEnquiry({ ...parsed.data, sellerId, productId });
      setSent(true); form.reset(); toast.success("Enquiry sent — the seller will reply on WhatsApp.");
    } finally { setSubmitting(false); }
  };

  return <section id="enquiry" className="mt-12 max-w-2xl scroll-mt-24"><h2 className="text-xl font-extrabold">Send an enquiry / booking request</h2><p className="mt-1 text-sm text-muted-foreground">{productName ? `About: ${productName}` : "The seller replies directly on WhatsApp."}</p><form onSubmit={submit} className="card-soft mt-4 space-y-4 p-5" noValidate><div className="grid gap-4 sm:grid-cols-2"><div><Label htmlFor="customerName">Your name</Label><Input id="customerName" name="customerName" maxLength={80} className="mt-1.5" />{errors.customerName && <p className="mt-1 text-xs text-destructive">{errors.customerName}</p>}</div><div><Label htmlFor="phone">WhatsApp number</Label><Input id="phone" name="phone" inputMode="tel" maxLength={15} className="mt-1.5" />{errors.phone && <p className="mt-1 text-xs text-destructive">{errors.phone}</p>}</div></div><div><Label htmlFor="eventDate">Event / delivery date</Label><Input id="eventDate" name="eventDate" type="date" /></div><div><Label htmlFor="message">What do you need?</Label><Textarea id="message" name="message" rows={4} maxLength={1000} className="mt-1.5" />{errors.message && <p className="mt-1 text-xs text-destructive">{errors.message}</p>}</div><Button type="submit" disabled={submitting} className="w-full rounded-full sm:w-auto">{submitting ? "Sending…" : "Send enquiry"}</Button>{sent && <p className="text-xs text-primary">Sent. It now appears in the seller's dashboard under Enquiries.</p>}</form></section>;
}

function ReviewForm({ sellerId, onSubmitted }: { sellerId: string; onSubmitted: () => void }) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (submitting) return;
    const form = e.currentTarget;
    const fd = new FormData(form);
    const parsed = reviewSchema.safeParse({ customerName: String(fd.get("reviewer") ?? ""), rating: fd.get("rating"), comment: String(fd.get("comment") ?? "") });
    if (!parsed.success) { const next: Record<string, string> = {}; for (const issue of parsed.error.issues) next[String(issue.path[0])] = issue.message; setErrors(next); return; }
    setErrors({}); setSubmitting(true);
    try {
      await createReview({ sellerId, customerName: parsed.data.customerName, rating: parsed.data.rating, comment: parsed.data.comment });
      setSent(true); form.reset(); onSubmitted(); toast.success("Review submitted for NammaSpot moderation.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Unable to submit review. Please try again.");
    } finally { setSubmitting(false); }
  };

  return <form onSubmit={submit} className="card-soft mt-6 space-y-4 p-5" noValidate><div><h3 className="text-base font-bold">Share your experience</h3><p className="mt-1 text-xs text-muted-foreground">Your review will appear after NammaSpot moderation.</p></div><div><Label htmlFor="reviewer">Your name</Label><Input id="reviewer" name="reviewer" maxLength={80} className="mt-1.5" />{errors.customerName && <p className="mt-1 text-xs text-destructive">{errors.customerName}</p>}</div><div><Label htmlFor="rating">Rating</Label><select id="rating" name="rating" defaultValue="5" className="mt-1.5 flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"><option value="5">5 — Excellent</option><option value="4">4 — Good</option><option value="3">3 — Okay</option><option value="2">2 — Needs improvement</option><option value="1">1 — Poor</option></select></div><div><Label htmlFor="comment">Review</Label><Textarea id="comment" name="comment" rows={4} maxLength={1000} className="mt-1.5" />{errors.comment && <p className="mt-1 text-xs text-destructive">{errors.comment}</p>}</div><Button type="submit" disabled={submitting} className="rounded-full">{submitting ? "Submitting…" : "Submit review"}</Button>{sent && <p className="text-xs text-primary">Thanks! Your review is awaiting moderation.</p>}</form>;
}
