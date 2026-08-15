import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { PageHeading, SiteShell } from "@/components/site/SiteShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useStoreData } from "@/hooks/use-store-data";
import { allSellers } from "@/lib/api";
import { setSession } from "@/lib/session";

export const Route = createFileRoute("/seller/login")({
  head: () => ({
    meta: [
      { title: "Seller Login — NammaSpot" },
      {
        name: "description",
        content:
          "Sign in to your NammaSpot seller dashboard to manage your catalogue, enquiries, customers and analytics.",
      },
      { property: "og:title", content: "Seller Login — NammaSpot" },
      { property: "og:description", content: "Access your NammaSpot seller dashboard." },
    ],
  }),
  component: SellerLogin,
});

function SellerLogin() {
  const navigate = useNavigate();
  const { data: sellers } = useStoreData(allSellers);
  const [email, setEmail] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const match = (sellers ?? []).find(
      (s) => s.email.toLowerCase() === email.trim().toLowerCase(),
    );
    if (!match) {
      toast.error("No seller found with that email.");
      return;
    }
    setSession(match.id);
    toast.success(`Vanakkam, ${match.ownerName.split(" ")[0]}!`);
    navigate({ to: "/seller/dashboard" });
  };

  return (
    <SiteShell>
      <PageHeading eyebrow="Sellers" title="Seller login" subtitle="Manage your Chennai brand." />
      <div className="mx-auto max-w-md px-4 py-8 lg:px-6">
        <form onSubmit={submit} className="card-soft space-y-4 p-5">
          <div>
            <Label htmlFor="email">Registered email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="hello@ammaveedubakes.in"
              className="mt-1.5"
            />
          </div>
          <Button type="submit" className="w-full rounded-full">Sign in</Button>
          <button
            type="button"
            onClick={() => setEmail("hello@ammaveedubakes.in")}
            className="w-full text-xs text-primary hover:underline"
          >
            Use the demo seller account
          </button>
          <p className="text-center text-xs text-muted-foreground">
            New here? <Link to="/seller/register" className="text-primary hover:underline">List your business</Link>
          </p>
        </form>
        <p className="mt-4 text-center text-xs text-muted-foreground">
          Demo login matches by email only. Swap in real authentication before going live.
        </p>
      </div>
    </SiteShell>
  );
}
