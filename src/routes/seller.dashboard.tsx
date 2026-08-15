import { createFileRoute, Link } from "@tanstack/react-router";
import {
  BarChart3,
  Boxes,
  Eye,
  Heart,
  Instagram,
  LayoutGrid,
  LogOut,
  MessageSquare,
  Settings,
  Store,
  Users,
} from "lucide-react";
import { useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
} from "recharts";
import { toast } from "sonner";

import { SiteShell } from "@/components/site/SiteShell";
import { PhotoPicker } from "@/components/site/PhotoPicker";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useStoreData } from "@/hooks/use-store-data";
import {
  addProduct,
  allCustomers,
  categoryById,
  enquiriesBySeller,
  inr,
  productsBySeller,
  reviewsBySeller,
  sellerById,
  setCustomerAvatar,
  setProductImage,
} from "@/lib/api";
import { clearSession, getSession } from "@/lib/session";

const SECTIONS = [
  { id: "overview", label: "Overview", icon: LayoutGrid },
  { id: "business", label: "My Business", icon: Store },
  { id: "catalogue", label: "Catalogue", icon: Boxes },
  { id: "enquiries", label: "Enquiries", icon: MessageSquare },
  { id: "customers", label: "Customers", icon: Users },
  { id: "instagram", label: "Instagram", icon: Instagram },
  { id: "analytics", label: "Analytics", icon: BarChart3 },
  { id: "settings", label: "Settings", icon: Settings },
] as const;

type SectionId = (typeof SECTIONS)[number]["id"];

export const Route = createFileRoute("/seller/dashboard")({
  head: () => ({
    meta: [
      { title: "Seller Dashboard — NammaSpot" },
      {
        name: "description",
        content:
          "Track profile views, manage your catalogue, respond to enquiries and see your customers — all from the NammaSpot seller dashboard.",
      },
      { property: "og:title", content: "Seller Dashboard — NammaSpot" },
      { property: "og:description", content: "Manage your Chennai brand on NammaSpot." },
    ],
  }),
  component: Dashboard,
});

const VIEWS_7D = [
  { day: "Mon", views: 118 },
  { day: "Tue", views: 164 },
  { day: "Wed", views: 132 },
  { day: "Thu", views: 205 },
  { day: "Fri", views: 241 },
  { day: "Sat", views: 268 },
  { day: "Sun", views: 196 },
];

function Dashboard() {
  const [section, setSection] = useState<SectionId>("overview");
  const { data: sellerId } = useStoreData(getSession);
  const { data: seller, refresh: refreshSeller } = useStoreData(() => {
    const sid = getSession();
    return sid ? (sellerById(sid) ?? null) : null;
  });
  const { data: products, refresh: refreshProducts } = useStoreData(() => {
    const sid = getSession();
    return sid ? productsBySeller(sid) : [];
  });
  const { data: enquiries } = useStoreData(() => {
    const sid = getSession();
    return sid ? enquiriesBySeller(sid) : [];
  });
  const { data: customers, refresh: refreshCustomers } = useStoreData(allCustomers);
  const { data: reviews } = useStoreData(() => {
    const sid = getSession();
    return sid ? reviewsBySeller(sid) : [];
  });

  if (sellerId === null || (sellerId && seller === null)) {
    return (
      <SiteShell>
        <div className="mx-auto max-w-md px-4 py-24 text-center">
          <h1 className="text-2xl font-extrabold">Sign in to your dashboard</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Seller dashboards are private to each business.
          </p>
          <div className="mt-6 flex justify-center gap-2">
            <Button asChild className="rounded-full"><Link to="/seller/login">Seller login</Link></Button>
            <Button asChild variant="outline" className="rounded-full">
              <Link to="/seller/register">Register</Link>
            </Button>
          </div>
        </div>
      </SiteShell>
    );
  }

  if (!seller) {
    return (
      <SiteShell>
        <div className="mx-auto max-w-6xl px-4 py-24 text-sm text-muted-foreground">Loading dashboard…</div>
      </SiteShell>
    );
  }

  const list = products ?? [];
  const enq = enquiries ?? [];

  return (
    <SiteShell>
      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-8 lg:grid-cols-[220px_minmax(0,1fr)] lg:px-6">
        {/* Sidebar */}
        <aside className="min-w-0 lg:sticky lg:top-24 lg:self-start">
          <div className="flex min-w-0 items-center gap-3">
            <div className="grid size-10 shrink-0 place-items-center rounded-full bg-primary font-display font-bold text-primary-foreground">
              {seller.businessName.charAt(0)}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold">Seller Dashboard</p>
              <p className="truncate text-xs text-muted-foreground">{seller.businessName}</p>
            </div>
          </div>

          {seller.status !== "approved" && (
            <Badge variant="secondary" className="mt-3">Pending admin approval</Badge>
          )}

          <nav className="mt-5 flex gap-1 overflow-x-auto pb-2 lg:flex-col lg:overflow-visible lg:pb-0">
            {SECTIONS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setSection(id)}
                className={`flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  section === id
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-secondary"
                }`}
              >
                <Icon className="size-4" aria-hidden /> {label}
              </button>
            ))}
          </nav>
        </aside>

        {/* Content */}
        <div className="min-w-0">
          <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 border-b border-border pb-5 sm:flex sm:justify-between">
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">
                Vanakkam, {seller.ownerName.split(" ")[0]} 👋
              </p>
              <h1 className="mt-1 text-2xl font-extrabold sm:text-3xl">
                Here's how your shop is doing.
              </h1>
            </div>
            <div className="flex shrink-0 gap-2">
              <Button asChild variant="outline" size="sm" className="rounded-full">
                <Link to="/seller/$slug" params={{ slug: seller.slug }}>
                  <Eye className="size-4" /> View profile
                </Link>
              </Button>
              <Button size="sm" className="rounded-full" onClick={() => setSection("catalogue")}>
                Add product
              </Button>
            </div>
          </header>

          <div className="pt-6">
            {section === "overview" && (
              <>
                <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                  {[
                    { label: "Profile Views", value: "1,284", delta: "+12%", icon: Eye },
                    { label: "Catalogue Views", value: "864", delta: "+5%", icon: Boxes },
                    { label: "New Enquiries", value: String(enq.filter((e) => e.status === "new").length), delta: "live", icon: MessageSquare },
                    { label: "Saved", value: "137", delta: "+18%", icon: Heart },
                  ].map((m) => (
                    <div key={m.label} className="card-soft p-4">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-xs text-muted-foreground">{m.label}</p>
                        <m.icon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                      </div>
                      <p className="mt-2 text-xl font-extrabold text-primary">
                        {m.value}{" "}
                        <span className="text-xs font-medium text-muted-foreground">{m.delta}</span>
                      </p>
                    </div>
                  ))}
                </div>

                <div className="mt-4 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
                  <div className="card-soft p-4">
                    <p className="text-sm font-bold text-primary">Profile Views Over Time</p>
                    <div className="mt-4 h-56">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={VIEWS_7D}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                          <XAxis dataKey="day" fontSize={11} tickLine={false} axisLine={false} />
                          <Tooltip />
                          <Bar dataKey="views" fill="var(--color-chart-2)" radius={[6, 6, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="card-soft p-4">
                    <p className="text-sm font-bold text-primary">Popular Products</p>
                    <ul className="mt-3 space-y-3">
                      {list
                        .slice()
                        .sort((a, b) => b.views - a.views)
                        .slice(0, 4)
                        .map((p) => (
                          <li key={p.id} className="grid grid-cols-[minmax(0,1fr)_auto] gap-3">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium">{p.name}</p>
                              <p className="text-xs text-primary">{inr(p.price)}</p>
                            </div>
                            <p className="shrink-0 text-right text-xs text-muted-foreground">
                              {p.views}
                              <br />
                              views
                            </p>
                          </li>
                        ))}
                    </ul>
                  </div>
                </div>
              </>
            )}

            {section === "business" && (
              <div className="card-soft max-w-2xl space-y-4 p-5">
                <h2 className="text-lg font-extrabold">Business profile</h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label>Business name</Label>
                    <Input defaultValue={seller.businessName} className="mt-1.5" />
                  </div>
                  <div>
                    <Label>Category</Label>
                    <Input readOnly value={categoryById(seller.categoryId)?.name ?? ""} className="mt-1.5" />
                  </div>
                  <div>
                    <Label>Area</Label>
                    <Input defaultValue={seller.area} className="mt-1.5" />
                  </div>
                  <div>
                    <Label>WhatsApp</Label>
                    <Input defaultValue={seller.whatsapp} className="mt-1.5" />
                  </div>
                </div>
                <div>
                  <Label>Tagline</Label>
                  <Input defaultValue={seller.tagline} className="mt-1.5" />
                </div>
                <div>
                  <Label>About</Label>
                  <Textarea rows={4} defaultValue={seller.about} className="mt-1.5" />
                </div>
                <Button className="rounded-full" onClick={() => toast.success("Profile saved")}>
                  Save changes
                </Button>
              </div>
            )}

            {section === "catalogue" && (
              <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
                <div className="space-y-3">
                  {list.map((p) => (
                    <div key={p.id} className="card-soft grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 p-4">
                      <PhotoPicker
                        src={p.imageUrl}
                        alt={p.name}
                        label="Photo"
                        className="size-16 rounded-lg"
                        onPicked={(dataUrl) => {
                          setProductImage(p.id, dataUrl);
                          refreshProducts();
                          toast.success("Photo updated");
                        }}
                      />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold">{p.name}</p>
                        <p className="line-clamp-1 text-xs text-muted-foreground">{p.description}</p>
                        <p className="mt-1 text-xs font-semibold text-primary">
                          {inr(p.price)} / {p.unit}
                        </p>
                      </div>
                      <Badge variant="secondary" className="shrink-0 text-[10px] uppercase">{p.type}</Badge>
                    </div>
                  ))}
                </div>
                <AddProductForm
                  sellerId={seller.id}
                  onAdded={() => {
                    refreshProducts();
                    refreshSeller();
                  }}
                />
              </div>
            )}

            {section === "enquiries" && (
              <div className="space-y-3">
                {enq.length === 0 && (
                  <p className="text-sm text-muted-foreground">No enquiries yet.</p>
                )}
                {enq.map((e) => (
                  <div key={e.id} className="card-soft p-4">
                    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold">{e.customerName}</p>
                        <p className="text-xs text-muted-foreground">
                          {e.phone} · event {e.eventDate || "—"} · received {e.createdAt}
                        </p>
                      </div>
                      <Badge
                        variant={e.status === "new" ? "default" : "secondary"}
                        className="shrink-0 text-[10px] uppercase"
                      >
                        {e.status}
                      </Badge>
                    </div>
                    <p className="mt-3 text-sm text-muted-foreground">{e.message}</p>
                    <Button asChild size="sm" variant="outline" className="mt-3 rounded-full">
                      <a href={`https://wa.me/${e.phone}`} target="_blank" rel="noreferrer">
                        Reply on WhatsApp
                      </a>
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {section === "customers" && (
              <div className="card-soft divide-y divide-border">
                {(customers ?? []).map((c) => (
                  <div key={c.id} className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 p-4">
                    <PhotoPicker
                      src={c.avatarUrl}
                      alt={c.name}
                      label="DP"
                      className="size-11 rounded-full"
                      onPicked={(dataUrl) => {
                        setCustomerAvatar(c.id, dataUrl);
                        refreshCustomers();
                        toast.success("Profile picture updated");
                      }}
                    />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{c.name}</p>
                      <p className="text-xs text-muted-foreground">{c.phone} · {c.area}</p>
                    </div>
                    <p className="shrink-0 text-xs text-muted-foreground">since {c.createdAt}</p>
                  </div>
                ))}
              </div>
            )}

            {section === "instagram" && (
              <div className="card-soft max-w-xl p-5">
                <h2 className="text-lg font-extrabold">Instagram</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Your listing links straight to your Instagram, so customers can see your latest
                  work before enquiring.
                </p>
                <div className="mt-4">
                  <Label>Handle</Label>
                  <Input defaultValue={seller.instagram} className="mt-1.5" />
                </div>
                <Button asChild variant="outline" className="mt-4 rounded-full">
                  <a href={`https://instagram.com/${seller.instagram}`} target="_blank" rel="noreferrer">
                    <Instagram className="size-4" /> Open profile
                  </a>
                </Button>
              </div>
            )}

            {section === "analytics" && (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="card-soft p-4">
                  <p className="text-sm font-bold text-primary">Weekly views</p>
                  <div className="mt-4 h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={VIEWS_7D}>
                        <XAxis dataKey="day" fontSize={11} tickLine={false} axisLine={false} />
                        <Tooltip />
                        <Bar dataKey="views" fill="var(--color-chart-1)" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                <div className="card-soft space-y-3 p-4">
                  <p className="text-sm font-bold text-primary">Summary</p>
                  <p className="text-sm text-muted-foreground">
                    Catalogue items: <strong className="text-foreground">{list.length}</strong>
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Total product views:{" "}
                    <strong className="text-foreground">
                      {list.reduce((sum, p) => sum + p.views, 0)}
                    </strong>
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Enquiries received: <strong className="text-foreground">{enq.length}</strong>
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Published reviews:{" "}
                    <strong className="text-foreground">{(reviews ?? []).length}</strong>
                  </p>
                </div>
              </div>
            )}

            {section === "settings" && (
              <div className="card-soft max-w-xl space-y-4 p-5">
                <h2 className="text-lg font-extrabold">Settings</h2>
                <div>
                  <Label>Contact email</Label>
                  <Input defaultValue={seller.email} className="mt-1.5" />
                </div>
                <div>
                  <Label>Delivery</Label>
                  <Select defaultValue={seller.deliversAcrossCity ? "city" : "area"}>
                    <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="city">Delivers across the city</SelectItem>
                      <SelectItem value="area">Local area / pickup only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-wrap gap-2 pt-2">
                  <Button className="rounded-full" onClick={() => toast.success("Settings saved")}>
                    Save
                  </Button>
                  <Button
                    variant="outline"
                    className="rounded-full"
                    onClick={() => {
                      clearSession();
                      toast.success("Signed out");
                      window.location.assign("/seller/login");
                    }}
                  >
                    <LogOut className="size-4" /> Sign out
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </SiteShell>
  );
}

function AddProductForm({
  sellerId,
  onAdded,
}: {
  sellerId: string;
  onAdded: () => void;
}) {
  const [type, setType] = useState<"product" | "service">("product");
  const [imageUrl, setImageUrl] = useState<string>("");

  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const name = String(fd.get("name") ?? "").trim();
    const price = Number(fd.get("price"));
    if (name.length < 2 || !Number.isFinite(price) || price < 0) {
      toast.error("Add a name and a valid price");
      return;
    }
    addProduct({
      sellerId,
      name: name.slice(0, 80),
      type,
      price,
      unit: String(fd.get("unit") ?? "piece").slice(0, 30),
      description: String(fd.get("description") ?? "").slice(0, 400),
      ...(imageUrl ? { imageUrl } : {}),
    });
    e.currentTarget.reset();
    setImageUrl("");
    onAdded();
    toast.success("Added to your catalogue");
  };

  return (
    <form onSubmit={submit} className="card-soft h-fit space-y-3 p-4">
      <p className="text-sm font-bold">Add product / service</p>
      <div className="flex items-center gap-3">
        <PhotoPicker
          src={imageUrl || undefined}
          alt="new item"
          label="Photo"
          className="size-16 rounded-lg"
          onPicked={setImageUrl}
        />
        <p className="text-xs text-muted-foreground">Photo (optional)</p>
      </div>
      <div>
        <Label htmlFor="name">Name</Label>
        <Input id="name" name="name" className="mt-1.5" maxLength={80} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label htmlFor="price">Price ₹</Label>
          <Input id="price" name="price" inputMode="numeric" className="mt-1.5" />
        </div>
        <div>
          <Label htmlFor="unit">Unit</Label>
          <Input id="unit" name="unit" defaultValue="piece" className="mt-1.5" maxLength={30} />
        </div>
      </div>
      <div>
        <Label>Type</Label>
        <Select value={type} onValueChange={(v) => setType(v as "product" | "service")}>
          <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="product">Product</SelectItem>
            <SelectItem value="service">Service</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea id="description" name="description" rows={3} className="mt-1.5" maxLength={400} />
      </div>
      <Button type="submit" className="w-full rounded-full">Add to catalogue</Button>
    </form>
  );
}
