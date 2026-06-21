import type { Metadata } from "next";
import "../globals.css";
import { SideBar } from "@/modules/sidebar/sidebar";

export const metadata: Metadata = {
  title: "Traffic Testing and AI Performance Analysis",
  description:
    "Create traffic tests, run load testing scenarios, review backend metrics, and use AI analysis to find bottlenecks before real users are affected.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <SideBar />
      {children}
    </>
  );
}
