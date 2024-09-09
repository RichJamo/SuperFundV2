import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThirdwebProvider } from "thirdweb/react";
import { ToastContainer } from "react-toastify"; // Import the ToastContainer
import 'react-toastify/dist/ReactToastify.css'; // Import the Toastify CSS

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "OmniYield",
  description: "OmniYield Yield Aggregator",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <ThirdwebProvider>
          {children}
          <ToastContainer /> 
        </ThirdwebProvider>
      </body>
    </html>
  );
}
