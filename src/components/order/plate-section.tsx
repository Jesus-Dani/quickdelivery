"use client";

import Image from "next/image";
import { formatMoney } from "@/lib/format";

export interface MenuItemOption {
  id: string;
  name: string;
  price_per_spoon: number;
  photo_url: string | null;
}

interface PlateSectionProps {
  title: string;
  description: string;
  menuItems: MenuItemOption[];
  spoonCounts: Record<string, number>;
  onChange: (menuItemId: string, spoonCount: number) => void;
}

export function PlateSection({
  title,
  description,
  menuItems,
  spoonCounts,
  onChange,
}: PlateSectionProps) {
  return (
    <section className="rounded-2xl border border-black/5 bg-white p-4 dark:border-white/10 dark:bg-[#2a1c16]">
      <h2 className="text-lg font-bold text-black dark:text-zinc-50">{title}</h2>
      <p className="mt-0.5 text-sm text-zinc-600 dark:text-zinc-400">
        {description}
      </p>

      <ul className="mt-4 flex flex-col divide-y divide-black/5 dark:divide-white/10">
        {menuItems.map((item) => {
          const count = spoonCounts[item.id] ?? 0;
          return (
            <li key={item.id} className="flex items-center gap-3 py-3">
              <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-brand-amber-soft dark:bg-[#3a2717]">
                {item.photo_url ? (
                  <Image
                    src={item.photo_url}
                    alt={item.name}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-xl">
                    🍲
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-black dark:text-zinc-50">
                  {item.name}
                </p>
                <p className="text-sm tabular-nums text-zinc-600 dark:text-zinc-400">
                  {formatMoney(item.price_per_spoon)} / spoon
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  aria-label={`Decrease ${item.name}`}
                  onClick={() => onChange(item.id, Math.max(0, count - 1))}
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-brand-red text-lg leading-none text-brand-red disabled:opacity-30 dark:border-brand-red-bright dark:text-brand-red-bright"
                  disabled={count === 0}
                >
                  −
                </button>
                <span
                  key={count}
                  className="inline-block w-6 animate-spoon-bump text-center tabular-nums font-medium text-black dark:text-zinc-50"
                >
                  {count}
                </span>
                <button
                  type="button"
                  aria-label={`Increase ${item.name}`}
                  onClick={() => onChange(item.id, count + 1)}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-red text-lg leading-none text-white dark:bg-brand-red-bright"
                >
                  +
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
