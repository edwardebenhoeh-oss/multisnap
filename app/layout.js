import "./globals.css";

export const metadata = {
  title: {
    default: "FLIPR — Turn clutter into cash",
    template: "%s | FLIPR",
  },
  description:
    "The fastest way to flip real-world items. Scan a photo, AI detects every item, instant listings on the FLIPR marketplace.",
  keywords: ["flipr", "flip items", "sell online", "marketplace", "listings", "resell", "declutter"],
  openGraph: {
    title: "FLIPR — Turn clutter into cash",
    description: "Scan. Detect. List. Flip. The fastest way to turn clutter into cash.",
    type: "website",
  },
  themeColor: "#08080f",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body style={{ margin: 0, padding: 0, background: "#08080f" }}>
        {children}
      </body>
    </html>
  );
}
