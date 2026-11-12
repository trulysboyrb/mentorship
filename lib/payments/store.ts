import type { SupabaseClient } from "@supabase/supabase-js";
import type { PaymentStore } from "./handlers";
import { emailPaymentAlert } from "./alertHook";
import { paidGmdFor } from "../currency";

// The real PaymentStore: talks to the database through the service role client.
export function supabasePaymentStore(db: SupabaseClient): PaymentStore {
  return {
    async markPaid(paymentId, ref, paidAmount) {
      // Card payments in US dollars report dollars. The database compares dalasi, so convert first.
      let paidGmd = paidAmount;
      if (paidAmount !== null) {
        const { data: pay } = await db.from("payments").select("*").eq("id", paymentId).maybeSingle();
        if (pay) {
          paidGmd = paidGmdFor(
            {
              currency: pay.currency ?? null,
              amount_gmd: Number(pay.amount_gmd),
              amount_charged: pay.amount_charged == null ? null : Number(pay.amount_charged),
            },
            paidAmount
          );
        }
      }
      const { data, error } = await db.rpc("payment_mark_paid", {
        p_payment: paymentId,
        p_ref: ref,
        p_paid_gmd: paidGmd,
      });
      if (error) throw new Error(error.message);
      const outcome = String(data);
      await emailPaymentAlert(db, paymentId, outcome); // optional email copy; never throws
      return outcome;
    },
    async markStatus(paymentId, status, note) {
      // Providers repeat "partially paid" messages. Only the first one should send an email.
      let wasPending = false;
      if (status === "underpaid") {
        const { data: before } = await db.from("payments").select("status").eq("id", paymentId).maybeSingle();
        wasPending = before?.status === "pending";
      }
      const { data, error } = await db.rpc("payment_mark_status", {
        p_payment: paymentId,
        p_status: status,
        p_note: note,
      });
      if (error) throw new Error(error.message);
      if (status === "underpaid" && wasPending && data === "updated") {
        await emailPaymentAlert(db, paymentId, "underpaid"); // optional email copy; never throws
      }
      return String(data);
    },
    async findByRef(provider, ref) {
      const { data } = await db
        .from("payments")
        .select("id")
        .eq("provider", provider)
        .eq("provider_ref", ref)
        .maybeSingle();
      return data?.id ?? null;
    },
    async logEvent(e) {
      await db.from("payment_events").insert({
        provider: e.provider,
        event_type: e.eventType,
        payment_id: e.paymentId,
        handled: e.handled,
        outcome: e.outcome,
        payload: e.payload as object,
      });
    },
  };
}
