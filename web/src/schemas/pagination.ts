import { z } from "zod"

export const PaginationSchema = z.object({
  page: z.number().int().positive(),
  page_size: z.number().int().positive(),
  total: z.number().int().nonnegative(),
  total_pages: z.number().int().nonnegative(),
  has_next: z.boolean(),
})

export type Pagination = z.infer<typeof PaginationSchema>
