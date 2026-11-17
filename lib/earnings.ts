// Types and wording for referral earnings and payout requests.

export type Earnings = {
  reward: number;
  min_payout: number;
  rewarded_friends: number;
  earned: number;
  paid: number;
  pending: number;
  available: number;
  has_open_request: boolean;
};

export type PayoutRow = {
  id: string;
  amount: number;
  payout_info: string;
  status: "requested" | "paid" | "rejected";
  admin_note: string | null;
  created_at: string;
  resolved_at: string | null;
};

export function canRequestPayout(e: Earnings): boolean {
  return !e.has_open_request && e.available > 0 && e.available >= e.min_payout;
}

export function payoutHint(e: Earnings): string {
  if (e.has_open_request) return "Your request is waiting. We will send the money and mark it paid.";
  if (e.available <= 0) return "Share your code. You earn when a friend who joined with it is cleared.";
  if (e.available < e.min_payout) {
    const left = e.min_payout - e.available;
    return `You can request a payout once you have D${e.min_payout.toLocaleString("en-US")} available (D${left.toLocaleString("en-US")} to go).`;
  }
  return "Ready to cash out.";
}

export function payoutStatusLabel(s: PayoutRow["status"]): string {
  return s === "requested" ? "Waiting" : s === "paid" ? "Paid" : "Not paid";
}
