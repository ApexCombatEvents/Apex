import "./globals.css";
import Navbar from "@/components/Navbar";
import MobileNav from "@/components/MobileNav";
import Footer from "@/components/Footer";
import Script from "next/script";

export const metadata = {
  title: "Apex",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <Script
          src="//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit"
          strategy="afterInteractive"
        />
        <Script id="google-translate-init" strategy="afterInteractive">
          {`
            function googleTranslateElementInit() {
              new google.translate.TranslateElement({
                pageLanguage: 'en',
                layout: google.translate.TranslateElement.InlineLayout.SIMPLE,
                autoDisplay: false
              }, 'google_translate_element');
            }

            // Force language if cookie is set
            (function() {
              const lang = localStorage.getItem('language');
              if (lang && lang !== 'en') {
                document.cookie = "googtrans=/en/" + lang + "; path=/; domain=" + window.location.hostname;
                document.cookie = "googtrans=/en/" + lang + "; path=/";
              }
            })();
          `}
        </Script>
        <style>{`
          /* Hide Google Translate attribution/banner/toolbar */
          .goog-te-banner-frame.skiptranslate, 
          .goog-te-gadget-icon,
          .goog-te-menu-frame,
          #goog-gt-tt,
          .goog-te-balloon-frame,
          iframe.goog-te-banner-frame {
            display: none !important;
            visibility: hidden !important;
          }
          body {
            top: 0 !important;
          }
          .goog-te-menu-value span:nth-child(5) {
            display: none !important;
          }
          #google_translate_element {
            display: none !important;
          }
          .skiptranslate {
            display: none !important;
          }
        `}</style>
      </head>
      <body className="min-h-screen pb-16 md:pb-0 flex flex-col">
        <Navbar />
        <main className="w-full py-8 sm:py-10 px-4 sm:px-6 lg:px-8 flex-1">
          {children}
        </main>
        <Footer />
        <MobileNav />
        {/* Hidden element for Google Translate to mount to */}
        <div id="google_translate_element"></div>
      </body>
    </html>
  );
}
