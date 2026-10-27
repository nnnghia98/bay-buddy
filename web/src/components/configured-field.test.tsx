import * as React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"
import { ConfiguredAstryxField, ConfiguredField, ConfiguredValue, FieldPreferencesProvider } from "./configured-field"
import { Input } from "./ui/input"
import { Label } from "./ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table"
import { fieldPreferenceSchema } from "@/schemas/field-preferences"

const state = vi.hoisted(() => ({ token: "test-session", userId: "first" }))
vi.mock("@/lib/auth-context", () => ({ useAuth: () => ({ token: state.token, isReady: true }) }))
vi.mock("@/locales/client", () => ({ useI18n: () => (key: string) => key }))
vi.mock("@tanstack/react-query", () => ({
  useQuery: ({ queryKey }: { queryKey: string[] }) => ({ data: queryKey[0] === "current-user" ? { id: state.userId } : {
    preferences: state.userId === "first" ? {
      "ticket.pnr": fieldPreferenceSchema.parse({ label: "Booking", visible: false }),
      "ticket.net_price": fieldPreferenceSchema.parse({ label: "Cost", minimum: 100 }),
    } : {},
  } }),
}))

function render(children: React.ReactNode) {
  return renderToStaticMarkup(<FieldPreferencesProvider>{children}</FieldPreferencesProvider>)
}

describe("personal field rendering", () => {
  it("hides a heading and its cells together", () => {
    const html = render(<Table><TableHeader><TableRow><TableHead field="ticket.pnr">PNR</TableHead></TableRow></TableHeader><TableBody><TableRow><TableCell field="ticket.pnr">ABC123</TableCell></TableRow></TableBody></Table>)
    expect(html).toMatch(/<th [^>]*hidden=""[^>]*>Booking<\/th>/)
    expect(html).toMatch(/<td [^>]*hidden=""[^>]*>ABC123<\/td>/)
  })

  it("renames labels and retains stricter native validation", () => {
    const html = render(<ConfiguredField field="ticket.net_price"><Label htmlFor="cost">Price</Label><Input id="cost" type="number" min={200} /></ConfiguredField>)
    expect(html).toContain(">Cost</label>")
    expect(html).toContain('min="200"')
  })

  it("renames Astryx form labels", () => {
    const html = render(<ConfiguredField field="ticket.net_price"><ConfiguredAstryxField label="Price" inputID="price"><Input id="price" /></ConfiguredAstryxField></ConfiguredField>)
    expect(html).toContain("Cost")
    expect(html).not.toContain(">Price<")
  })

  it("keeps mandatory controls visible and omits hidden read values", () => {
    const html = render(<><ConfiguredField field="ticket.pnr" systemRequired><Input required /></ConfiguredField><ConfiguredValue field="ticket.pnr"><p>Private booking</p></ConfiguredValue></>)
    expect(html).not.toContain('hidden=""')
    expect(html).toContain('required=""')
    expect(html).not.toContain("Private booking")
  })

  it("does not apply another user's preferences or logged-out preferences", () => {
    try {
      state.userId = "second"
      expect(render(<ConfiguredField field="ticket.pnr"><Label>PNR</Label></ConfiguredField>)).toContain(">PNR</label>")
      state.userId = "first"
      state.token = ""
      expect(render(<ConfiguredField field="ticket.pnr"><Label>PNR</Label></ConfiguredField>)).not.toContain('hidden=""')
    } finally {
      state.userId = "first"
      state.token = "test-session"
    }
  })
})
