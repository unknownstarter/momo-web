import { MobileContainer } from "@/components/ui/mobile-container";

export default function ShareDetailLoading() {
  return (
    <MobileContainer className="h-dvh max-h-dvh bg-hanji flex flex-col overflow-hidden animate-pulse">
      <header className="shrink-0 px-5 pt-6 pb-4">
        <div className="flex flex-col items-center">
          <div className="w-24 h-24 rounded-full bg-hanji-secondary" />
          <div className="mt-3 w-24 h-4 rounded-full bg-hanji-secondary" />
        </div>
      </header>
      <div className="border-b border-hanji-border">
        <div className="flex">
          <div className="flex-1 py-3 flex justify-center">
            <div className="w-10 h-4 rounded-full bg-hanji-secondary" />
          </div>
          <div className="flex-1 py-3 flex justify-center">
            <div className="w-10 h-4 rounded-full bg-hanji-secondary" />
          </div>
        </div>
      </div>
      <div className="flex-1 px-5 pt-6 space-y-6">
        <div className="h-16 rounded-2xl bg-hanji-secondary" />
        <div className="h-24 rounded-2xl bg-hanji-secondary" />
        <div className="h-32 rounded-2xl bg-hanji-secondary" />
      </div>
    </MobileContainer>
  );
}
