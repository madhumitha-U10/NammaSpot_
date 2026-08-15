import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

import { PageHeading, SiteShell } from "@/components/site/SiteShell";
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
import { categories, registerSeller } from "@/lib/api";
import { useStoreData } from "@/hooks/use-store-data";
import { setSession } from "@/lib/session";
import {
  signUpSeller,
  validateNammaspotId,
  validatePassword,
} from "@/lib/seller-auth";

export const Route = createFileRoute("/seller/register")({
  head: () => ({
    meta: [
      { title: "List Your Business — NammaSpot for Sellers" },
      {
        name: "description",
        content:
          "Free listing for Chennai and Tamil Nadu small businesses. Create a shareable profile, publish your catalogue and receive enquiries in one place.",
      },
      { property: "og:title", content: "List Your Business — NammaSpot for Sellers" },
      {
        property: "og:description",
        content: "Register your Instagram-based business on NammaSpot in under two minutes.",
      },
    ],
  }),
  component: RegisterSeller,
});

const schema = z.object({
  nammaspotId: z.string(),
  password: z.string(),
  confirmPassword: z.string(),
  businessName: z.string().trim().min(2, "Business name is required").max(80),
  ownerName: z.string().trim().min(2, "Owner name is required").max(80),
  categoryId: z.string().min(1, "Pick a category"),
  area: z.string().trim().min(2, "Enter your area").max(60),
  city: z.string().trim().min(2).max(40),
  instagram: z.string().trim().min(2, "Instagram handle is required").max(40),
  whatsapp: z.string().trim().regex(/^[0-9]{10,15}$/, "Digits only, with country code"),
  email: z.string().trim().email("Enter a valid email").max(120),
  tagline: z.string().trim().min(6, "One line about your business").max(120),
  about: z.string().trim().min(20, "Tell customers a bit more").max(1000),
  priceFrom: z.coerce.number().min(0).max(1000000),
});

function RegisterSeller() {
  const navigate = useNavigate();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [categoryId, setCategoryId] = useState("");
  const [busy, setBusy] = useState(false);
  const { data: cats } = useStoreData(categories);

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const nammaspotId = String(fd.get("nammaspotId") ?? "");
    const password = String(fd.get("password") ?? "");
    const confirmPassword = String(fd.get("confirmPassword") ?? "");
    const parsed = schema.safeParse({
      nammaspotId,
      password,
      confirmPassword,
      businessName: fd.get("businessName"),
      ownerName: fd.get("ownerName"),
      categoryId,
      area: fd.get("area"),
      city: fd.get("city"),
      instagram: String(fd.get("instagram") ?? "").replace("@", ""),
      whatsapp: fd.get("whatsapp"),
      email: fd.get("email"),
      tagline: fd.get("tagline"),
      about: fd.get("about"),
      priceFrom: fd.get("priceFrom"),
    });

    const next: Record<string, string> = {};
    if (!parsed.success) {
      for (const issue of parsed.error.issues) next[String(issue.path[0])] = issue.message;
    }
    const idError = validateNammaspotId(nammaspotId);
    if (idError) next["nammaspotId"] = idError;
    const pwError = validatePassword(password);
    if (pwError) next["password"] = pwError;
    if (!next["password"] && password !== confirmPassword)
      next["confirmPassword"] = "Passwords do not match";

    if (Object.keys(next).length || !parsed.success) {
      setErrors(next);
      return;
    }
    setErrors({});

    const { nammaspotId: _id, password: _pw, confirmPassword: _cpw, ...profile } = parsed.data;

    setBusy(true);
    const seller = registerSeller(profile);
    const auth = await signUpSeller({ nammaspotId, password, sellerId: seller.id });
    setBusy(false);

    if (!auth.ok) {
      setErrors({ nammaspotId: auth.error ?? "Could not create your account." });
      toast.error(auth.error ?? "Could not create your account.");
      return;
    }

    setSession(seller.id);
    toast.success("Registered! Your profile is pending admin approval.");
    navigate({ to: "/seller/dashboard" });
  };

  const err = (k: string) =>
    errors[k] ? <p className="mt-1 text-xs text-destructive">{errors[k]}</p> : null;

  return (
    <SiteShell>
      <PageHeading
        eyebrow="For sellers"
        title="List your business"
        subtitle="Free for Chennai and Tamil Nadu makers. Admin approves new profiles within 24 hours."
      />
      <div className="mx-auto max-w-2xl px-4 py-8 lg:px-6">
        <form onSubmit={submit} className="card-soft space-y-4 p-5" noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="businessName">Business name</Label>
              <Input id="businessName" name="businessName" className="mt-1.5" maxLength={80} />
              {err("businessName")}
            </div>
            <div>
              <Label htmlFor="ownerName">Your name</Label>
              <Input id="ownerName" name="ownerName" className="mt-1.5" maxLength={80} />
              {err("ownerName")}
            </div>
            <div>
              <Label>Category</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger className="mt-1.5"><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>
                  {(cats ?? []).map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {err("categoryId")}
            </div>
            <div>
              <Label htmlFor="area">Area</Label>
              <Input id="area" name="area" placeholder="Anna Nagar" className="mt-1.5" maxLength={60} />
              {err("area")}
            </div>
            <div>
              <Label htmlFor="city">City</Label>
              <Input id="city" name="city" placeholder="Chennai" defaultValue="Chennai" className="mt-1.5" maxLength={40} />
              {err("city")}
            </div>
            <div>
              <Label htmlFor="instagram">Instagram handle</Label>
              <Input id="instagram" name="instagram" placeholder="ammaveedubakes" className="mt-1.5" maxLength={40} />
              {err("instagram")}
            </div>
            <div>
              <Label htmlFor="whatsapp">WhatsApp (with 91)</Label>
              <Input id="whatsapp" name="whatsapp" inputMode="numeric" placeholder="919840112233" className="mt-1.5" maxLength={15} />
              {err("whatsapp")}
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" className="mt-1.5" maxLength={120} />
              {err("email")}
            </div>
            <div>
              <Label htmlFor="priceFrom">Starting price (₹)</Label>
              <Input id="priceFrom" name="priceFrom" inputMode="numeric" defaultValue="500" className="mt-1.5" />
              {err("priceFrom")}
            </div>
          </div>
          <div className="grid gap-4 border-t border-border pt-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <h2 className="text-sm font-semibold">Your NammaSpot login</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Choose a unique NammaSpot ID and a password — you will use these to sign in.
              </p>
            </div>
            <div>
              <Label htmlFor="nammaspotId">NammaSpot ID</Label>
              <Input
                id="nammaspotId"
                name="nammaspotId"
                autoCapitalize="none"
                spellCheck={false}
                autoComplete="username"
                placeholder="ammaveedubakes"
                className="mt-1.5"
                maxLength={24}
              />
              {err("nammaspotId")}
            </div>
            <div className="hidden sm:block" />
            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                className="mt-1.5"
              />
              {err("password")}
            </div>
            <div>
              <Label htmlFor="confirmPassword">Confirm password</Label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                className="mt-1.5"
              />
              {err("confirmPassword")}
            </div>
          </div>
          <div>
            <Label htmlFor="tagline">One-line tagline</Label>
            <Input id="tagline" name="tagline" className="mt-1.5" maxLength={120} />
            {err("tagline")}
          </div>
          <div>
            <Label htmlFor="about">About your business</Label>
            <Textarea id="about" name="about" rows={4} className="mt-1.5" maxLength={1000} />
            {err("about")}
          </div>
          <Button type="submit" disabled={busy} className="w-full rounded-full">
            {busy ? "Creating…" : "Create my profile"}
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            Already listed? <Link to="/seller/login" className="text-primary hover:underline">Seller login</Link>
          </p>
        </form>
      </div>
    </SiteShell>
  );
}
