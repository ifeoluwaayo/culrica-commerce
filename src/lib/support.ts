import "server-only";
import type { SupportTicket, TicketStatus } from "./commerce";
import { assertStorageConfigured, db, localMutation, readCommerce, useSupabase, writeCommerce } from "./db";

type TicketRow = {
  id: string;
  ticket_reference: string;
  customer_email: string;
  order_id: string | null;
  category: SupportTicket["category"];
  issue_text: string;
  status: TicketStatus;
  created_at: string;
  updated_at: string;
  orders?: { reference: string } | null;
};

const ticketFromRow = (r: TicketRow): SupportTicket => ({
  id: r.id,
  ticketReference: r.ticket_reference,
  customerEmail: r.customer_email,
  orderId: r.order_id,
  orderReference: r.orders?.reference ?? null,
  category: r.category,
  issueText: r.issue_text,
  status: r.status,
  createdAt: r.created_at,
  updatedAt: r.updated_at
});

export async function allSupportTickets(): Promise<SupportTicket[]> {
  assertStorageConfigured();
  if (useSupabase) {
    try {
      const { data, error } = await db()
        .from("chord_support_tickets")
        .select("id, ticket_reference, customer_email, order_id, category, issue_text, status, created_at, updated_at, orders(reference)")
        .order("created_at", { ascending: false });

      if (error) {
        // If the table hasn't been created in Supabase yet, return empty list gracefully
        console.warn("Unable to fetch chord_support_tickets from Supabase:", error.message);
        return [];
      }
      return ((data ?? []) as unknown as TicketRow[]).map(ticketFromRow);
    } catch (err) {
      console.warn("Error querying chord_support_tickets:", err);
      return [];
    }
  }

  const commerce = await readCommerce();
  return commerce.tickets ?? [];
}

export async function updateSupportTicketStatus(id: string, status: TicketStatus): Promise<SupportTicket> {
  assertStorageConfigured();
  if (useSupabase) {
    const { data, error } = await db()
      .from("chord_support_tickets")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select("id, ticket_reference, customer_email, order_id, category, issue_text, status, created_at, updated_at, orders(reference)")
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!data) throw new Error("Support ticket not found.");
    return ticketFromRow(data as unknown as TicketRow);
  }

  return localMutation(async () => {
    const commerce = await readCommerce();
    commerce.tickets ??= [];
    const index = commerce.tickets.findIndex((t) => t.id === id);
    if (index < 0) throw new Error("Support ticket not found.");
    commerce.tickets[index] = {
      ...commerce.tickets[index],
      status,
      updatedAt: new Date().toISOString()
    };
    await writeCommerce(commerce);
    return commerce.tickets[index];
  });
}
