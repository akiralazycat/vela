import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Vela Player — Adaptive, live, and quietly designed.",
  description: "A themeable HLS/DASH player with multilingual audio, live DVR, chapters, accessibility controls, an embed SDK, and Web Component distribution.",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <script src="/vela-settings-layer.js" defer />
        {children}
      </body>
    </html>
  );
}
