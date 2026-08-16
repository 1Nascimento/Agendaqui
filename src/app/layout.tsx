import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Agendaqui",
  description: "Modulo 1 do Agendaqui: contas e autenticacao."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
