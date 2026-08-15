import { Link } from "@tanstack/react-router";
import { MapPin, Instagram } from "lucide-react";

import { Rating } from "@/components/site/Rating";
import { Badge } from "@/components/ui/badge";
import { categoryById, inr, type Seller } from "@/lib/api";
import { imageForCategorySlug } from "@/lib/images";

export function SellerCard({ seller }: { seller: Seller }) {
  const category = categoryById(seller.categoryId);

  return (
    <Link
      to="/seller/$slug"
      params={{ slug: seller.slug }}
      className="group card-soft flex overflow-hidden transition-shadow hover:shadow-[var(--shadow-lift)] sm:flex-col"
    >
      <div className="w-28 shrink-0 overflow-hidden bg-secondary sm:h-40 sm:w-full">
        <img
          src={imageForCategorySlug(category?.slug)}
          alt={seller.businessName}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1.5 p-3.5 sm:p-4">
        <div className="flex min-w-0 items-start justify-between gap-2">
          <h3 className="min-w-0 truncate text-base font-bold">{seller.businessName}</h3>
          {seller.featured && (
            <Badge variant="secondary" className="shrink-0 text-[10px] uppercase tracking-wide">
              Featured
            </Badge>
          )}
        </div>
        <p className="line-clamp-2 text-xs text-muted-foreground">{seller.tagline}</p>
        <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 pt-1.5 text-xs text-muted-foreground">
          <Rating value={seller.rating} count={seller.reviewCount} />
          <span className="inline-flex items-center gap-1">
            <MapPin className="size-3.5" aria-hidden />
            {seller.area}
          </span>
          <span className="inline-flex items-center gap-1">
            <Instagram className="size-3.5" aria-hidden />@{seller.instagram}
          </span>
        </div>
        <p className="text-xs font-semibold text-primary">From {inr(seller.priceFrom)}</p>
      </div>
    </Link>
  );
}
