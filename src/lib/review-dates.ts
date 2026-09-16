/** First day of the month, `monthsAgo` months before the current month (0 = this month). */
function startOfMonthMonthsAgo(monthsAgo: number, ref = new Date()) {
  return new Date(ref.getFullYear(), ref.getMonth() - monthsAgo, 1);
}

/** Last day of the month containing `ref`. */
function endOfMonth(ref = new Date()) {
  return new Date(ref.getFullYear(), ref.getMonth() + 1, 0);
}

export function toIsoDate(d: Date) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

/** Default review window: current month plus the previous two (e.g. Sep → Jul 1 – Sep 30). */
export function defaultReviewDateRange(ref = new Date()) {
  return {
    from: toIsoDate(startOfMonthMonthsAgo(2, ref)),
    to: toIsoDate(endOfMonth(ref)),
  };
}

export function thisMonthDateRange(ref = new Date()) {
  return {
    from: toIsoDate(startOfMonthMonthsAgo(0, ref)),
    to: toIsoDate(endOfMonth(ref)),
  };
}

export function lastMonthsDateRange(monthCount: number, ref = new Date()) {
  return {
    from: toIsoDate(startOfMonthMonthsAgo(monthCount - 1, ref)),
    to: toIsoDate(endOfMonth(ref)),
  };
}
