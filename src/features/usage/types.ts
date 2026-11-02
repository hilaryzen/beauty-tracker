// @spec USAGE-001
export type ItemUsage = {
  id: number,
  name: string,
  brand: string,
  category: string,
  uses: Record<string, number>,
  currentMonth: string,
  usesThisMonth: number
}
