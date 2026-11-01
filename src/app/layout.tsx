import "./globals.css";
import type { ReactNode } from "react";

export const metadata = {
  title: "DocuFlow",
  description: "Gabung, kompres, konversi, dan bagikan PDF.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
