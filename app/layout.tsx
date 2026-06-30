import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "METAFORGE — Raw Material Inventory",
  description: "FIFO material inventory & tracking · Khatwad plant",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
