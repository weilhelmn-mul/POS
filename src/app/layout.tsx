import type { Metadata, Viewport } from "next";
import { Inter, Outfit } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Providers } from "@/components/providers";
import { ServiceWorkerRegister } from "@/components/sw-register";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"], display: "swap" });
const outfit = Outfit({ variable: "--font-outfit", subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  title: "POS Pro · Ventas e Inventario",
  description: "Sistema profesional de punto de venta, inventario y gestión comercial",
  manifest: "/manifest.json",
  applicationName: "POS Pro",
  appleWebApp: { capable: true, title: "POS Pro", statusBarStyle: "black-translucent" },
  icons: { icon: [{ url: "/icon-192.png", sizes: "192x192", type: "image/png" }, { url: "/icon-512.png", sizes: "512x512", type: "image/png" }], apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }], shortcut: ["/favicon-32.png"] },
};
export const viewport: Viewport = { width: "device-width", initialScale: 1, maximumScale: 1, userScalable: false, viewportFit: "cover", themeColor: [{ media: "(prefers-color-scheme: light)", color: "#fbfdff" }, { media: "(prefers-color-scheme: dark)", color: "#0b1326" }] };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-25..0&display=swap" rel="stylesheet" />
      </head>
      <body className={`${inter.variable} ${outfit.variable} antialiased bg-background text-foreground`}>
        <Providers>{children}<Toaster /><Sonner /><ServiceWorkerRegister /></Providers>
      </body>
    </html>
  );
}
