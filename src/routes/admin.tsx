import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, ShieldCheck, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { PageHeading, SiteShell } from "@/components/site/SiteShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useStoreData } from "@/hooks/use-store-data";
import { allEnquiries, allProducts, allReviews, allSellers, categories, categoryById, inr, sellerById, setReviewApproval, setSellerStatus } from "@/lib/api";
import { authenticateAdmin } from "@/lib/sheets.functions";
import { isAdmin, setAdmin } from "@/lib/session";

const TABS = [
  { id: "approval", label: "Seller Approval" },
  { id: "sellers", label: "Sellers" },
  { id: "catalogue", label: "Products / Services" },
  { id: "categories", label: "Categories" },
  { id: "enquiries", label: "Enquiries" },
  { id: "reviews", label: "Reviews" },
] as const;

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [
    { title: "Admin Console — NammaSpot" },
    { name: "description", content: "NammaSpot admin console: approve sellers, moderate reviews and monitor enquiries across the Chennai marketplace." },
    { property: "og:title", content: "Admin Console — NammaSpot" },
    { property: "og:description", content: "Moderation and approvals for NammaSpot." },
    { name: "robots", content: "noindex" },
  ] }),
  component: Admin,
});

function Admin() {
  const { data: signedIn, refresh: refreshAuth } = useStoreData(isAdmin);
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("approval");
  const [tick, setTick] = useState(0);
  const { data: sellers, refresh: refreshSellers } = useStoreData(allSellers);
  const { data: reviews, refresh: refreshReviews } = useStoreData(allReviews);
  const { data: enquiries } = useStoreData(allEnquiries);
  const { data: products } = useStoreData(allProducts);

  if (signedIn === null) return <SiteShell><div className="mx-auto max-w-6xl px-4 py-24 text-sm text-muted-foreground">Loading…</div></SiteShell>;

  if (!signedIn) return (
    <SiteShell>
      <PageHeading eyebrow="Admin" title="Admin login" subtitle="Restricted to the NammaSpot team." />
      <div className="mx-auto max-w-sm px-4 py-8 lg:px-6">
        <form className="card-soft space-y-4 p-5" onSubmit={async (e) => {
          e.preventDefault();
          const code = String(new FormData(e.currentTarget).get("code") ?? "");
          const result = await authenticateAdmin({ data: { password: code } });
          if (!result.ok) { toast.error("Invalid access code"); return; }
          setAdmin(true); refreshAuth();
        }}>
          <div><Label htmlFor="code">Access code</Label><Input id="code" name="code" type="password" className="mt-1.5" autoComplete="current-password" /></div>
          <Button type="submit" className="w-full rounded-full"><ShieldCheck className="size-4" /> Enter console</Button>
          <p className="text-xs text-muted-foreground">Admin access is restricted to the NammaSpot team.</p>
        </form>
      </div>
    </SiteShell>
  );

  const all = sellers ?? [];
  const pending = all.filter((s) => s.status === "pending");
  const decide = (id: string, status: "approved" | "rejected") => {
    setSellerStatus(id, status); refreshSellers(); setTick(tick + 1);
    toast.success(status === "approved" ? "Seller approved and live" : "Seller rejected");
  };

  return (
    <SiteShell>
      <PageHeading eyebrow="Admin" title="Moderation console" subtitle="Approve new sellers, moderate reviews and keep an eye on enquiries." />
      <div className="mx-auto max-w-6xl px-4 py-6 lg:px-6">
        <nav className="flex gap-1 overflow-x-auto pb-2">{TABS.map((t) => <button key={t.id} onClick={() => setTab(t.id)} className={`shrink-0 rounded-full px-3.5 py-2 text-sm font-medium transition-colors ${tab === t.id ? "bg-primary text-primary-foreground" : "hover:bg-secondary"}`}>{t.label}{t.id === "approval" && pending.length > 0 && ` (${pending.length})`}</button>)}</nav>
        <div className="mt-6">
          {tab === "approval" && <div className="space-y-3">{pending.length === 0 && <p className="text-sm text-muted-foreground">Nothing waiting for approval.</p>}{pending.map((s) => <div key={s.id} className="card-soft p-4"><div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3"><div className="min-w-0"><p className="truncate text-sm font-bold">{s.businessName}</p><p className="text-xs text-muted-foreground">{s.ownerName} · {categoryById(s.categoryId)?.name} · {s.area}, {s.city}</p><p className="mt-2 text-sm text-muted-foreground">{s.about}</p><p className="mt-2 text-xs text-muted-foreground">@{s.instagram} · {s.email} · applied {s.createdAt}</p></div><div className="flex shrink-0 gap-2"><Button size="sm" className="rounded-full" onClick={() => decide(s.id, "approved")}><Check className="size-4" /> Approve</Button><Button size="sm" variant="outline" className="rounded-full" onClick={() => decide(s.id, "rejected")}><X className="size-4" /> Reject</Button></div></div></div>)}</div>}
          {tab === "sellers" && <div className="card-soft divide-y divide-border">{all.map((s) => <div key={s.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 p-4"><div className="min-w-0"><Link to="/seller/$slug" params={{ slug: s.slug }} className="truncate text-sm font-semibold hover:text-primary">{s.businessName}</Link><p className="truncate text-xs text-muted-foreground">{categoryById(s.categoryId)?.name} · {s.area} · {s.reviewCount} reviews</p></div><div className="flex shrink-0 items-center gap-2"><Badge variant={s.status === "approved" ? "default" : "secondary"}>{s.status}</Badge>{s.status !== "approved" ? <Button size="sm" variant="outline" className="rounded-full" onClick={() => decide(s.id, "approved")}>Approve</Button> : <Button size="sm" variant="ghost" className="rounded-full" onClick={() => decide(s.id, "rejected")}>Suspend</Button>}</div></div>)}</div>}
          {tab === "catalogue" && <div className="card-soft divide-y divide-border">{(products ?? []).map((p) => <div key={p.id} className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 p-4"><div className="min-w-0"><p className="truncate text-sm font-semibold">{p.name}</p><p className="truncate text-xs text-muted-foreground">{sellerById(p.sellerId)?.businessName} · {p.type}</p></div><p className="shrink-0 text-sm font-semibold text-primary">{inr(p.price)}</p></div>)}</div>}
          {tab === "categories" && <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{categories().map((c) => <div key={c.id} className="card-soft p-4"><p className="text-sm font-bold">{c.name}</p><p className="text-xs text-primary/80">{c.tamilName}</p><p className="mt-2 text-xs text-muted-foreground">{c.blurb}</p><p className="mt-3 text-xs text-muted-foreground">{all.filter((s) => s.categoryId === c.id).length} sellers · slug <code>{c.slug}</code></p></div>)}</div>}
          {tab === "enquiries" && <div className="card-soft divide-y divide-border">{(enquiries ?? []).map((e) => <div key={e.id} className="p-4"><div className="grid grid-cols-[minmax(0,1fr)_auto] gap-3"><div className="min-w-0"><p className="truncate text-sm font-semibold">{e.customerName} → {sellerById(e.sellerId)?.businessName}</p><p className="text-xs text-muted-foreground">{e.phone} · event {e.eventDate || "—"} · {e.createdAt}</p></div><Badge variant="secondary" className="shrink-0">{e.status}</Badge></div><p className="mt-2 text-sm text-muted-foreground">{e.message}</p></div>)}</div>}
          {tab === "reviews" && <div className="space-y-3">{(reviews ?? []).map((r) => <div key={r.id} className="card-soft p-4"><div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3"><div className="min-w-0"><p className="truncate text-sm font-semibold">{r.customerName} · {r.rating}★</p><p className="text-xs text-muted-foreground">{sellerById(r.sellerId)?.businessName} · {r.createdAt}</p><p className="mt-2 text-sm text-muted-foreground">{r.comment}</p></div><Button size="sm" variant={r.approved ? "ghost" : "default"} className="shrink-0 rounded-full" onClick={() => { setReviewApproval(r.id, !r.approved); refreshReviews(); toast.success(r.approved ? "Review hidden" : "Review published"); }}>{r.approved ? "Hide" : "Publish"}</Button></div></div>)}</div>}
        </div>
        <Button variant="outline" className="mt-8 rounded-full" onClick={() => { setAdmin(false); refreshAuth(); }}>Sign out of admin</Button>
      </div>
    </SiteShell>
  );
}
