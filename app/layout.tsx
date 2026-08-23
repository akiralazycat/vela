import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import "./v2.css";

export const metadata: Metadata = {
  title: "Vela Player — Adaptive video, without the chrome.",
  description: "A minimal, themeable HLS and MPEG-DASH player with an embed SDK.",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
