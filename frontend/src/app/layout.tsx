import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThirdwebProvider } from "thirdweb/react";
import { ToastContainer } from "react-toastify"; // Import the ToastContainer
import 'react-toastify/dist/ReactToastify.css'; // Import the Toastify CSS

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Amana",
  description: "Amana Yield Aggregator",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body className={inter.className}>
        <ThirdwebProvider>
          {children}
          <ToastContainer /> 
        </ThirdwebProvider>
      </body>
    </html>
  );
}
