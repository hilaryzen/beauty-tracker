"use client"

import { ThemeProvider } from "next-themes"
import type { ThemeProviderProps } from "next-themes"

export interface ColorModeProviderProps extends ThemeProviderProps {}

// @spec SHELL-UI-002
export function ColorModeProvider(props: ColorModeProviderProps) {
  return (
    <ThemeProvider attribute="class" disableTransitionOnChange {...props} />
  )
}
