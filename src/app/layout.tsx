import type { Metadata } from "next";
import { Jost, Source_Serif_4 } from "next/font/google";
import { Toaster } from "~/components/ui/sonner";
import "./globals.css";

const sans = Jost({
  variable: "--font-jost",
  subsets: ["latin", "latin-ext"],
});

const serif = Source_Serif_4({
  variable: "--font-source-serif",
  subsets: ["latin", "latin-ext"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: "Erstgespräch",
  description: "Voice-Agent für das erste Gespräch mit Gründerinnen und Gründern.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="de"
      className={`${sans.variable} ${serif.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        {children}
        <Toaster theme="light" />
      </body>
    </html>
  );
}
