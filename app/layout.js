import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

export const metadata = {
  title: "The Cash-Flow Machine | Asset Accelerator",
  description:
    "One rental property. Two engines. See what it pays you — then watch that cash flow build a second income stream.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        {children}
        <Analytics />
      </body>
    </html>
  );
}
