export type ItemUsage = {
  id: number,
  name: string,
  brand: string,
  category: string,
  uses: Record<string, number>,
  usesThisMonth: number
}