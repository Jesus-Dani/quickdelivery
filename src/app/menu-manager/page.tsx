"use client";

import { PasscodeGate } from "@/components/menu-manager/passcode-gate";
import { MenuManagerApp } from "@/components/menu-manager/menu-manager-app";

export default function MenuManagerPage() {
  return (
    <div className="flex flex-1 flex-col bg-cream">
      <PasscodeGate>{(passcode) => <MenuManagerApp passcode={passcode} />}</PasscodeGate>
    </div>
  );
}
