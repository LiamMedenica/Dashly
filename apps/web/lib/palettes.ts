export type ColorPalette = {
  id: string
  label: string
  primary: { light: string; dark: string }
  secondary: { light: string; dark: string }
  slices: [string, string, string, string, string]
}

export const COLOR_PALETTES: ColorPalette[] = [
  {
    id: "violet",
    label: "Violet",
    primary:   { light: "oklch(0.62 0.24 295)",  dark: "oklch(0.78 0.16 295)" },
    secondary: { light: "oklch(0.70 0.16 315)",  dark: "oklch(0.65 0.12 315)" },
    slices: ["oklch(0.62 0.24 295)", "oklch(0.67 0.20 320)", "oklch(0.65 0.19 265)", "oklch(0.71 0.15 335)", "oklch(0.69 0.12 250)"],
  },
  {
    id: "sky",
    label: "Sky",
    primary:   { light: "oklch(0.64 0.19 222)",  dark: "oklch(0.80 0.13 222)" },
    secondary: { light: "oklch(0.70 0.14 200)",  dark: "oklch(0.64 0.10 200)" },
    slices: ["oklch(0.64 0.19 222)", "oklch(0.68 0.16 245)", "oklch(0.70 0.14 200)", "oklch(0.66 0.17 260)", "oklch(0.73 0.11 185)"],
  },
  {
    id: "indigo",
    label: "Indigo",
    primary:   { light: "oklch(0.56 0.23 265)",  dark: "oklch(0.76 0.15 265)" },
    secondary: { light: "oklch(0.65 0.16 285)",  dark: "oklch(0.60 0.12 285)" },
    slices: ["oklch(0.56 0.23 265)", "oklch(0.63 0.21 295)", "oklch(0.67 0.17 245)", "oklch(0.70 0.13 310)", "oklch(0.65 0.15 230)"],
  },
  {
    id: "rose",
    label: "Rose",
    primary:   { light: "oklch(0.65 0.22 10)",   dark: "oklch(0.79 0.14 10)" },
    secondary: { light: "oklch(0.71 0.15 28)",   dark: "oklch(0.65 0.11 28)" },
    slices: ["oklch(0.65 0.22 10)", "oklch(0.68 0.19 350)", "oklch(0.70 0.16 30)", "oklch(0.66 0.20 330)", "oklch(0.73 0.12 20)"],
  },
  {
    id: "teal",
    label: "Teal",
    primary:   { light: "oklch(0.60 0.15 182)",  dark: "oklch(0.76 0.11 182)" },
    secondary: { light: "oklch(0.67 0.11 200)",  dark: "oklch(0.61 0.08 200)" },
    slices: ["oklch(0.60 0.15 182)", "oklch(0.65 0.13 200)", "oklch(0.63 0.12 165)", "oklch(0.68 0.10 218)", "oklch(0.66 0.09 150)"],
  },
  {
    id: "coral",
    label: "Coral",
    primary:   { light: "oklch(0.68 0.19 38)",   dark: "oklch(0.80 0.13 38)" },
    secondary: { light: "oklch(0.73 0.14 58)",   dark: "oklch(0.67 0.10 58)" },
    slices: ["oklch(0.68 0.19 38)", "oklch(0.65 0.22 18)", "oklch(0.72 0.15 58)", "oklch(0.70 0.17 350)", "oklch(0.75 0.10 72)"],
  },
]

export const DEFAULT_PALETTE_ID = "violet"

// Builds a palette from an arbitrary hex color (#rrggbb).
// Uses alpha-suffixed hex variants for slices so the hue stays consistent.
export function buildCustomPalette(hex: string): ColorPalette {
  return {
    id: "custom",
    label: "Custom",
    primary:   { light: hex, dark: hex },
    secondary: { light: hex + "bb", dark: hex + "bb" },
    slices: [hex, hex + "dd", hex + "aa", hex + "77", hex + "55"],
  }
}
