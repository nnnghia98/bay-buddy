const ticketAliases: Record<string, string> = {
  bookedAt: "ticket.booked_at", createdAt: "ticket.created_at", updatedAt: "ticket.updated_at",
  evPrice: "ticket.ev_price", astPrice: "ticket.ast_price", thfPrice: "ticket.thf_price",
  webPrice: "ticket.web_price", insurancePrice: "ticket.insurance_price", addInPrice: "ticket.add_in_price",
  customerPaid: "ticket.selling_price", income: "ticket.true_income",
  paymentAmount: "transaction.amount", paymentMethod: "transaction.method",
  description: "ticket.passengers", customer: "customer.name",
  customer_name: "customer.name", route: "ticket.itinerary",
  ticket_status: "ticket.status", passenger_names: "ticket.passengers",
  linked_payment_amount: "transaction.amount", payment_amount: "transaction.amount",
  payment_occurred_at: "transaction.payment_occurred_at",
  payment_method: "transaction.method", note: "transaction.note",
}

export function ticketFieldKey(key: string): string {
  return ticketAliases[key] ?? `ticket.${key === "ticket_number" ? key : key.replace(/^ticket_/, "")}`
}
