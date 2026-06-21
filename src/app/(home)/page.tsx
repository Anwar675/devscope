import type { Metadata } from "next";
import { HomePage } from "@/modules/home/home";

export const metadata: Metadata = {
  title: "Traffic Testing and Load Testing Platform",
  description:
    "DevScope AI helps backend teams simulate real-world traffic, run load tests, analyze performance metrics, and get AI recommendations for scaling.",
  alternates: {
    canonical: "/",
  },
};

const Home = () => {
  return (
    <div>
      <HomePage />
    </div>
  )
}

export default Home;
