import type { Review } from "@/data/seed";
import { ensureData, remoteSnapshot } from "@/lib/api";
import { appendSheetRow } from "@/lib/sheets.functions";

const id = () => `r_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

export async function createReview(input: Omit<Review, "id" | "approved" | "createdAt">): Promise<Review> {
  await ensureData(true);
  const duplicate = remoteSnapshot().reviews.some(
    (review) =>
      review.sellerId === input.sellerId &&
      review.customerName.trim().toLowerCase() === input.customerName.trim().toLowerCase() &&
      review.comment.trim().toLowerCase() === input.comment.trim().toLowerCase(),
  );
  if (duplicate) throw new Error("A matching review has already been submitted.");

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
