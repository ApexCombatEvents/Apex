import "./globals.css";
import Navbar from "@/components/Navbar";
import MobileNav from "@/components/MobileNav";
import Footer from "@/components/Footer";

export const metadata = {
  title: "Apex",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen pb-16 md:pb-0 flex flex-col">
        <Navbar />
        <main className="w-full py-8 sm:py-10 px-4 sm:px-6 lg:px-8 flex-1">
          {children}
        </main>
        <Footer />
        <MobileNav />
      </body>
    </html>
  );
}


