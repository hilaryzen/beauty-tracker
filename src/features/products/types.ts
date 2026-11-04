// @spec PROD-001
export type Product = {
  id: number,
  name: string,
  brand: string,
  category: string,
  uses: Record<string, number>,
  currentMonth: string,
  usesThisMonth: number
}
