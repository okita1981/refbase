import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: 'RefBase — AI Knowledge Infrastructure',
  description: '企業・サービス・商品に関する知識を、AIが理解・比較・推論・推薦できる形へ構造化する基盤。Question → Cluster → Entity → Reference → Evidence の構造で、AI の回答に自然に出現できる状態をつくる。',
  openGraph: {
    type: 'website',
    siteName: 'RefBase',
    title: 'RefBase — AI Knowledge Infrastructure',
    description: '企業・サービス・商品に関する知識を、AIが理解・比較・推論・推薦できる形へ構造化する基盤。',
    url: 'https://www.refbase.ai/',
    images: ['https://www.refbase.ai/og.png'],
    locale: 'ja_JP',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'RefBase — AI Knowledge Infrastructure',
    description: '企業・サービス・商品に関する知識を、AIが理解・比較・推論・推薦できる形へ構造化する基盤。',
  },
  icons: {
    icon: [
      { url: '/favicon.png', type: 'image/png' },
      { url: '/favicon-32.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: '/apple-touch-icon.png',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ja"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
