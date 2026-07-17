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
          { href: "/dashboard/cms", label: "Menu CMS" },
        ]
      : [{ href: "/dashboard/pool", label: "Order pool" }];

  return (
    <div className="flex min-h-full flex-1 flex-col bg-zinc-50 dark:bg-black">
      <header className="flex items-center justify-between border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
        <nav className="flex items-center gap-4">
          <span className="text-sm font-semibold text-black dark:text-zinc-50">
            {profile.name || (profile.role === "operator" ? "Operator" : "Courier")}
          </span>
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm text-zinc-600 hover:text-black dark:text-zinc-400 dark:hover:text-zinc-50"
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <SignOutButton />
      </header>
      <main className="flex-1 p-4">{children}</main>
    </div>
  );
}
