// Indian-grouped number formatting (matches the workbook style).
export const fmtInt = (n: number | null | undefined) =>
  Math.round(Number(n ?? 0)).toLocaleString("en-IN");

export const fmtKg = (n: number | null | undefined) =>
  `${fmtInt(n)} kg`;

export const fmtTonnes = (kg: number | null | undefined) =>
  `${(Number(kg ?? 0) / 1000).toLocaleString("en-IN", { maximumFractionDigits: 1 })} t`;
