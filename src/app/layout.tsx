"use client";
import { Inter, Outfit } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "@/components/ui/toast";
import { useEffect } from "react";
import { PushNotifications } from "@capacitor/push-notifications";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });
const outfit = Outfit({ subsets: ["latin"], variable: "--font-display" });

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {

  useEffect(() => {
  PushNotifications.requestPermissions().then((result) => {
    if (result.receive === "granted") {
      PushNotifications.register();
    }
  });

  PushNotifications.addListener("registration", (token) => {
    console.log("Push registration success, token:", token.value);
  });

  PushNotifications.addListener(
    "pushNotificationReceived",
    (notification) => {
      console.log("Push received:", notification);
    }
  );
}, []);



  return (
    <html lang="en" className={`${inter.variable} ${outfit.variable}`} suppressHydrationWarning>
      <head>
        <title>Sadbhawana Publication Author Dashboard</title>
        <meta name="description" content="Official publishing ecosystem of Sadbhawana Publication. Publishing is not our business, it is a hobby, literature is a service." />
      </head>
      <body className="antialiased">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}

