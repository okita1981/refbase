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
  title: 'RefBase | AIのための知識基盤',
  description: 'RefBaseは、企業・サービスに関する問い別の回答と根拠情報を構造化して公開する、AIのための参照知識基盤（Reference Base）です。AIが理解・引用しやすい情報を提供します。',
  openGraph: {
    type: 'website',
    siteName: 'RefBase',
    title: 'RefBase | AIのための知識基盤',
    description: 'RefBaseは、企業・サービスに関する問い別の回答と根拠情報を構造化して公開する、AIのための参照知識基盤（Reference Base）です。AIが理解・引用しやすい情報を提供します。',
    url: 'https://www.refbase.ai/',
    images: ['https://www.refbase.ai/og.png'],
    locale: 'ja_JP',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'RefBase | AIのための知識基盤',
    description: 'RefBaseは、企業・サービスに関する問い別の回答と根拠情報を構造化して公開する、AIのための参照知識基盤（Reference Base）です。AIが理解・引用しやすい情報を提供します。',
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
