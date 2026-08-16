import type { Review } from "@/data/seed";
import { ensureData } from "@/lib/api";
import { appendSheetRow } from "@/lib/sheets.functions";

const id = () => `r_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

export async function createReview(input: Omit<Review, "id" | "approved" | "createdAt">): Promise<Review> {
  const review: Review = {
    ...input,
    id: id(),
    approved: false,
    createdAt: new Date().toISOString().slice(0, 10),
  };

  const result = await appendSheetRow({
    data: {
      action: "addReview",
      row: {
        reviewId: review.id,
        sellerId: review.sellerId,
        customerName: review.customerName,
        rating: review.rating,
        comment: review.comment,
        createdAt: review.createdAt,
        approved: false,
      },
    },
  });

  if (!result.ok) throw new Error(result.error ?? "Unable to submit review");
  await ensureData(true);
  return review;
}
