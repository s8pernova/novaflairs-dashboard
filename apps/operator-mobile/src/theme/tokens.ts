export const colors = {
    background: "#11171d",
    surface: "#151d23",
    surfaceRaised: "#192128",
    plot: "#1b2a30",
    border: "#29323a",
    borderStrong: "#44515b",
    mapBorder: "#31404a",
    grid: "#2b4148",
    textPrimary: "#f4f6f8",
    textSecondary: "#b8c1c9",
    textMuted: "#71808d",
    textSubtle: "#687681",
    accent: "#2a9d8f",
    info: "#52a8e8",
    riskLow: "#69c779",
    riskElevated: "#f0b84b",
    riskHigh: "#f05d4f",
    riskUnknown: "#8f9ca6",
    white: "#ffffff",
} as const;

export const spacing = {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
} as const;

export const radii = {
    sm: 4,
    md: 6,
    full: 999,
} as const;

export const typography = {
    caption: 10,
    bodySmall: 12,
    body: 13,
    bodyLarge: 14,
    panelTitle: 16,
    heading: 20,
    title: 22,
    metric: 22,
} as const;
