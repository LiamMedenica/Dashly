export type ColorPalette = {
  id: string
  label: string
  primary: { light: string; dark: string }
  secondary: { light: string; dark: string }
  slices: [string, string, string, string, string]
}

export const COLOR_PALETTES: ColorPalette[] = [
  {
    id: "slate",
    label: "Slate",
    primary:   { light: "oklch(0.371 0 0)",     dark: "oklch(0.87 0 0)" },
    secondary: { light: "oklch(0.58 0 0)",       dark: "oklch(0.62 0 0)" },
    slices: ["oklch(0.371 0 0)", "oklch(0.47 0 0)", "oklch(0.57 0 0)", "oklch(0.66 0 0)", "oklch(0.74 0 0)"],
  },
  {
    id: "indigo",
    label: "Indigo",
    primary:   { light: "oklch(0.45 0.22 265)",  dark: "oklch(0.72 0.15 265)" },
    secondary: { light: "oklch(0.60 0.14 280)",  dark: "oklch(0.55 0.12 280)" },
    slices: ["oklch(0.45 0.22 265)", "oklch(0.55 0.18 285)", "oklch(0.63 0.14 250)", "oklch(0.70 0.10 300)", "oklch(0.76 0.07 230)"],
  },
  {
    id: "teal",
    label: "Teal",
    primary:   { light: "oklch(0.47 0.14 178)",  dark: "oklch(0.72 0.11 178)" },
    secondary: { light: "oklch(0.60 0.10 195)",  dark: "oklch(0.57 0.08 195)" },
    slices: ["oklch(0.47 0.14 178)", "oklch(0.57 0.12 195)", "oklch(0.65 0.09 160)", "oklch(0.72 0.07 210)", "oklch(0.78 0.05 145)"],
  },
  {
    id: "rose",
    label: "Rose",
    primary:   { light: "oklch(0.53 0.21 15)",   dark: "oklch(0.73 0.14 15)" },
    secondary: { light: "oklch(0.65 0.13 30)",   dark: "oklch(0.60 0.11 30)" },
    slices: ["oklch(0.53 0.21 15)", "oklch(0.62 0.16 30)", "oklch(0.70 0.12 350)", "oklch(0.75 0.08 45)", "oklch(0.80 0.05 330)"],
  },
  {
    id: "amber",
    label: "Amber",
    primary:   { light: "oklch(0.60 0.17 75)",   dark: "oklch(0.78 0.12 75)" },
    secondary: { light: "oklch(0.72 0.12 90)",   dark: "oklch(0.65 0.09 90)" },
    slices: ["oklch(0.60 0.17 75)", "oklch(0.69 0.14 60)", "oklch(0.75 0.11 90)", "oklch(0.79 0.08 105)", "oklch(0.83 0.05 45)"],
  },
  {
    id: "emerald",
    label: "Emerald",
    primary:   { light: "oklch(0.50 0.16 158)",  dark: "oklch(0.72 0.12 158)" },
    secondary: { light: "oklch(0.62 0.11 170)",  dark: "oklch(0.56 0.09 170)" },
    slices: ["oklch(0.50 0.16 158)", "oklch(0.60 0.13 170)", "oklch(0.67 0.10 145)", "oklch(0.73 0.07 185)", "oklch(0.78 0.05 130)"],
  },
]

export const DEFAULT_PALETTE_ID = "slate"
