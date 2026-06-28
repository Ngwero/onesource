import { Outlet } from "react-router-dom";
import { Header } from "./Header";
import { Footer } from "./Footer";
import { WebsiteLoader } from "./WebsiteLoader";
import { BackToTopButton } from "./BackToTopButton";
import { BasketSlidePanel } from "./BasketSlidePanel";
import { MobileBottomNav } from "./MobileBottomNav";

export function Layout() {
  return (
    <div className="min-h-screen min-h-[100dvh] flex flex-col bg-muted w-full">
      <Header />
      <main className="site-main flex-1 w-full min-w-0 overflow-x-hidden">
        <WebsiteLoader>
          <Outlet />
        </WebsiteLoader>
      </main>
      <Footer />
      <MobileBottomNav />
      <BackToTopButton />
      <BasketSlidePanel />
    </div>
  );
}
