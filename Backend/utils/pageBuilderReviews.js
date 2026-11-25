function normalizeCustomerReviews(value) {
  if (!Array.isArray(value)) return [];

  return value.slice(0, 20).flatMap((review) => {
    const author = String(review?.author || '').trim().slice(0, 80);
    const text = String(review?.text || '').trim().slice(0, 1000);
    const rating = Number(review?.rating);
    if (!author || !text || !Number.isInteger(rating) || rating < 1 || rating > 5) return [];
    return [{ author, text, rating }];
  });
}

module.exports = { normalizeCustomerReviews };