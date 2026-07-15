import "~/styles/globals.css";

import { type Metadata } from "next";
import { Geist } from "next/font/google";

import type { PropsWithChildren } from "react";
import { ThemeProvider } from "~/app/_components/theme-provider";
import { TermsGate } from "~/app/_components/terms-gate";
import { ToastProvider } from "~/app/_components/toast";
import { auth } from "~/server/auth";
import { TRPCReactProvider } from "~/trpc/react";

export const metadata: Metadata = {
  title: "SavingForBonding — Football Prediction App",
  description:
    "Predict football match outcomes, track your accuracy, and see who tops the beer donation board.",
};

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

export default async function RootLayout({ children }: PropsWithChildren) {
  const session = await auth();
  const needsTermsAcceptance = !!session?.user && !session.user.termsAcceptedAt;

  return (
    <html lang="en" className={`${geist.variable}`} suppressHydrationWarning>
      <body className="flex min-h-screen flex-col font-sans antialiased">
        <ThemeProvider>
          <TRPCReactProvider>
            <ToastProvider>
              <div className="flex-1">{children}</div>
              <TermsGate required={needsTermsAcceptance} />
            </ToastProvider>
          </TRPCReactProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
