import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentProfile } from "@/lib/supabase/profile";
import { SignOutButton } from "@/components/dashboard/sign-out-button";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await getCurrentProfile();

  // Defense in depth: proxy.ts already redirects signed-out visitors, but a
  // signed-in user with no operators/couriers row (shouldn't normally
  // happen — the signup trigger creates one) still shouldn't see the
  // dashboard shell.
  if (!profile) {
    redirect("/login");
  }

  const links =
    profile.role === "operator"
      ? [
          { href: "/dashboard/payments", label: "Payments" },
          { href: "/dashboard/board", label: "Dispatch board" },
          { href: "/dashboard/pool", label: "Order pool" },
          { href: "/dashboard/settings", label: "Settings" },
        ]
      : [{ href: "/dashboard/pool", label: "Order pool" }];

  return (
    <div className="flex min-h-full flex-1 flex-col bg-zinc-50">
      <header className="flex flex-col gap-2 border-b border-zinc-200 bg-white px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex items-center justify-between gap-4">
          <span className="shrink-0 text-sm font-bold text-brand">
            {profile.name || (profile.role === "operator" ? "Operator" : "Courier")}
          </span>
          <div className="sm:hidden">
            <SignOutButton />
          </div>
        </div>
        <nav className="flex flex-wrap items-center gap-x-4 gap-y-1">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm text-zinc-600 hover:text-black"
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="hidden sm:block">
          <SignOutButton />
        </div>
      </header>
      <main className="flex-1 p-4 sm:p-6">{children}</main>
    </div>
  );
}
