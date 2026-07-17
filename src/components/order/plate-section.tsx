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
    <section className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
      <h2 className="font-medium text-black dark:text-zinc-50">{title}</h2>
      <p className="mt-0.5 text-sm text-zinc-600 dark:text-zinc-400">
        {description}
      </p>

      <ul className="mt-4 flex flex-col divide-y divide-zinc-200 dark:divide-zinc-800">
        {menuItems.map((item) => {
          const count = spoonCounts[item.id] ?? 0;
          return (
            <li key={item.id} className="flex items-center gap-3 py-3">
              <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded bg-zinc-100 dark:bg-zinc-900">
                {item.photo_url && (
                  <Image
                    src={item.photo_url}
                    alt={item.name}
                    fill
                    className="object-cover"
                  />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-black dark:text-zinc-50">
                  {item.name}
                </p>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  {formatMoney(item.price_per_spoon)} / spoon
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  aria-label={`Decrease ${item.name}`}
                  onClick={() => onChange(item.id, Math.max(0, count - 1))}
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-zinc-300 text-lg leading-none disabled:opacity-30 dark:border-zinc-700"
                  disabled={count === 0}
                >
                  −
                </button>
                <span className="w-6 text-center tabular-nums text-black dark:text-zinc-50">
                  {count}
                </span>
                <button
                  type="button"
                  aria-label={`Increase ${item.name}`}
                  onClick={() => onChange(item.id, count + 1)}
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-zinc-300 text-lg leading-none dark:border-zinc-700"
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
