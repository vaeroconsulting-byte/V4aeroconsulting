import type { Metadata } from "next";
import { Montserrat, Roboto } from "next/font/google";
import "./globals.css";

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  display: "swap",
});

const roboto = Roboto({
  variable: "--font-roboto",
  subsets: ["latin"],
  weight: ["300", "400", "500", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Aviação | Apresentação institucional e comercial",
  description:
    "Apresentação demonstrativa de serviços, frota e solicitação de voos.",
  openGraph: {
    type: "website",
    locale: "pt_BR",
    siteName: "Plataforma de Aviação",
    title: "Aviação | Apresentação institucional e comercial",
    description:
      "Conheça a apresentação demonstrativa da plataforma de aviação.",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className={`${montserrat.variable} ${roboto.variable}`}>
      <body>{children}</body>
    </html>
  );
}
