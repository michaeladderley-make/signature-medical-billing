import type { Metadata } from "next";
import { AppHeader } from "@/components/app-header";
import { ManagersView } from "@/components/managers-view";

export const metadata: Metadata = {
  title: "Manager's View · Signature Medical Billing",
};

export default function ManagersViewPage() {
  return (
    <div className="flex h-dvh flex-col bg-pure-black text-bone">
      <AppHeader />
      <div className="flex min-h-0 flex-1 px-5 pb-5">
        <ManagersView />
      </div>
    </div>
  );
}
