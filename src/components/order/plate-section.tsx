"use client";

import Image from "next/image";
import { IconToolsKitchen2 } from "@tabler/icons-react";
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
    <section className="rounded-2xl border border-black/5 bg-white p-5">
      <h2 className="text-lg font-bold text-[#2C2114]">{title}</h2>
      <p className="mt-0.5 text-sm text-[#2C2114]/70">{description}</p>

      <ul className="mt-4 flex flex-col divide-y divide-black/5">
        {menuItems.map((item) => {
          const count = spoonCounts[item.id] ?? 0;
          return (
            <li key={item.id} className="flex items-center gap-3 py-3">
              <div className="relative aspect-[4/3] h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-brand-amber-soft">
                {item.photo_url ? (
                  <Image
                    src={item.photo_url}
                    alt={item.name}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-brand-amber-text">
                    <IconToolsKitchen2 size={22} stroke={1.5} />
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-[#2C2114]">{item.name}</p>
                <p className="text-sm tabular-nums text-[#2C2114]/70">
                  {formatMoney(item.price_per_spoon)} / spoon
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  aria-label={`Decrease ${item.name}`}
                  onClick={() => onChange(item.id, Math.max(0, count - 1))}
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-brand text-lg leading-none text-brand disabled:opacity-30"
                  disabled={count === 0}
                >
                  −
                </button>
                <span
                  key={count}
                  className="inline-block w-6 animate-spoon-bump text-center tabular-nums font-medium text-[#2C2114]"
                >
                  {count}
                </span>
                <button
                  type="button"
                  aria-label={`Increase ${item.name}`}
                  onClick={() => onChange(item.id, count + 1)}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-brand text-lg leading-none text-on-brand"
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
