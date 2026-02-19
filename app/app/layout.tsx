import { TopTabsHeader } from "@/components/layout/top-tabs-header";
import { CoinModalProvider } from "@/components/coins/coin-modal-provider";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <CoinModalProvider>
      <div className="min-h-screen bg-background">
        <TopTabsHeader />
        <div className="mx-auto max-w-[1400px] px-3 py-4 md:px-6 md:py-6">{children}</div>
      </div>
    </CoinModalProvider>
  );
}
