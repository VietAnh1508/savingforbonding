import "~/styles/globals.css";

import { type Metadata } from "next";
import { Geist } from "next/font/google";

import { ThemeProvider } from "~/app/_components/theme-provider";
import { ToastProvider } from "~/app/_components/toast";
import { TRPCReactProvider } from "~/trpc/react";

export const metadata: Metadata = {
  title: "SavingForBonding — Football Prediction App",
  description:
    "Predict football match outcomes, track your accuracy, and see who tops the beer donation board.",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

export default function RootLayout({ children }: React.PropsWithChildren) {
  return (
    <html lang="en" className={`${geist.variable}`} suppressHydrationWarning>
      <body className="font-sans antialiased">
        <ThemeProvider>
          <TRPCReactProvider>
            <ToastProvider>{children}</ToastProvider>
          </TRPCReactProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
