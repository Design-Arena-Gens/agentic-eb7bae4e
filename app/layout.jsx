export const metadata = {
  title: "3D Battery",
  description: "Interactive 3D battery component"
};

import "./globals.css";

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
