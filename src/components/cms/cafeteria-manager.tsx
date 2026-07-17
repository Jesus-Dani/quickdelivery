"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { PhotoUpload } from "./photo-upload";

interface MenuItemRow {
  id: string;
  name: string;
  price_per_spoon: number;
  photo_url: string | null;
  active: boolean;
}

interface Destination {
  id: string;
  name: string;
}

interface CafeteriaManagerProps {
  cafeteriaId: string;
  initialName: string;
  initialPhotoUrl: string | null;
  initialActive: boolean;
  initialItems: MenuItemRow[];
  destinations: Destination[];
  initialFees: Record<string, number>;
}

export function CafeteriaManager({
  cafeteriaId,
  initialName,
  initialPhotoUrl,
  initialActive,
  initialItems,
  destinations,
  initialFees,
}: CafeteriaManagerProps) {
  const supabase = useMemo(() => createClient(), []);

  const [name, setName] = useState(initialName);
  const [photoUrl, setPhotoUrl] = useState(initialPhotoUrl);
  const [active, setActive] = useState(initialActive);
  const [items, setItems] = useState<MenuItemRow[]>(initialItems);

  const [newItemName, setNewItemName] = useState("");
  const [newItemPrice, setNewItemPrice] = useState("");
  const [newItemPhoto, setNewItemPhoto] = useState<string | null>(null);
  const [addingItem, setAddingItem] = useState(false);
  const [addItemError, setAddItemError] = useState<string | null>(null);

  const [feeInputs, setFeeInputs] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const d of destinations) {
      initial[d.id] = initialFees[d.id] !== undefined ? String(initialFees[d.id]) : "";
    }
    return initial;
  });
  const [savingFees, setSavingFees] = useState(false);
  const [feeError, setFeeError] = useState<string | null>(null);
  const [feeSaved, setFeeSaved] = useState(false);

  async function updateCafeteria(fields: Partial<{ name: string; photo_url: string; active: boolean }>) {
    await supabase.from("cafeterias").update(fields).eq("id", cafeteriaId);
  }

  async function updateItem(itemId: string, fields: Partial<Omit<MenuItemRow, "id">>) {
    await supabase.from("menu_items").update(fields).eq("id", itemId);
    setItems((prev) => prev.map((i) => (i.id === itemId ? { ...i, ...fields } : i)));
  }

  async function handleAddItem() {
    const price = Number(newItemPrice);
    if (!newItemName.trim() || !price || price <= 0) {
      setAddItemError("Enter a name and a price greater than 0.");
      return;
    }
    setAddingItem(true);
    setAddItemError(null);

    const { data, error } = await supabase
      .from("menu_items")
      .insert({
        cafeteria_id: cafeteriaId,
        name: newItemName.trim(),
        price_per_spoon: price,
        photo_url: newItemPhoto,
      })
      .select("id, name, price_per_spoon, photo_url, active")
      .single();

    setAddingItem(false);

    if (error || !data) {
      setAddItemError(error?.message ?? "Couldn't add item.");
      return;
    }

    setItems((prev) => [...prev, data]);
    setNewItemName("");
    setNewItemPrice("");
    setNewItemPhoto(null);
  }

  async function handleSaveFees() {
    setSavingFees(true);
    setFeeError(null);
    setFeeSaved(false);

    const rows = Object.entries(feeInputs)
      .filter(([, value]) => value.trim() !== "")
      .map(([destination_id, value]) => ({
        cafeteria_id: cafeteriaId,
        destination_id,
        fee: Number(value),
      }));

    if (rows.some((r) => Number.isNaN(r.fee) || r.fee < 0)) {
      setSavingFees(false);
      setFeeError("Fees must be non-negative numbers.");
      return;
    }

    const { error } = await supabase
      .from("delivery_fees")
      .upsert(rows, { onConflict: "cafeteria_id,destination_id" });

    setSavingFees(false);

    if (error) {
      setFeeError(error.message);
      return;
    }

    setFeeSaved(true);
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-8">
      <section className="flex items-center gap-4 rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <PhotoUpload
          currentUrl={photoUrl}
          onUploaded={(url) => {
            setPhotoUrl(url);
            updateCafeteria({ photo_url: url });
          }}
        />
        <div className="flex flex-1 flex-col gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => name.trim() && name !== initialName && updateCafeteria({ name: name.trim() })}
            className="rounded-full border border-zinc-300 px-4 py-2 text-lg font-medium dark:border-zinc-700 dark:bg-zinc-900"
            placeholder="Cafeteria name"
          />
          <label className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
            <input
              type="checkbox"
              checked={active}
              onChange={(e) => {
                setActive(e.target.checked);
                updateCafeteria({ active: e.target.checked });
              }}
            />
            Active (visible to customers)
          </label>
        </div>
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="mb-3 font-bold text-black dark:text-zinc-50">Menu items</h2>

        <div className="flex flex-col divide-y divide-zinc-200 dark:divide-zinc-800">
          {items.map((item) => (
            <div key={item.id} className="flex items-center gap-3 py-3">
              <PhotoUpload
                currentUrl={item.photo_url}
                onUploaded={(url) => updateItem(item.id, { photo_url: url })}
              />
              <input
                defaultValue={item.name}
                onBlur={(e) => {
                  const value = e.target.value.trim();
                  if (value && value !== item.name) updateItem(item.id, { name: value });
                }}
                className="flex-1 rounded-full border border-zinc-300 px-3 py-1.5 dark:border-zinc-700 dark:bg-zinc-900"
              />
              <input
                type="number"
                min={0}
                step="0.01"
                defaultValue={item.price_per_spoon}
                onBlur={(e) => {
                  const value = Number(e.target.value);
                  if (value > 0 && value !== item.price_per_spoon)
                    updateItem(item.id, { price_per_spoon: value });
                }}
                className="w-24 rounded-full border border-zinc-300 px-3 py-1.5 dark:border-zinc-700 dark:bg-zinc-900"
              />
              <label className="flex items-center gap-1 text-xs text-zinc-500">
                <input
                  type="checkbox"
                  checked={item.active}
                  onChange={(e) => updateItem(item.id, { active: e.target.checked })}
                />
                active
              </label>
            </div>
          ))}
        </div>

        <div className="mt-3 flex items-center gap-3 border-t border-zinc-200 pt-3 dark:border-zinc-800">
          <PhotoUpload currentUrl={newItemPhoto} onUploaded={setNewItemPhoto} label="new item" />
          <input
            value={newItemName}
            onChange={(e) => setNewItemName(e.target.value)}
            placeholder="Item name"
            className="flex-1 rounded-full border border-zinc-300 px-3 py-1.5 dark:border-zinc-700 dark:bg-zinc-900"
          />
          <input
            type="number"
            min={0}
            step="0.01"
            value={newItemPrice}
            onChange={(e) => setNewItemPrice(e.target.value)}
            placeholder="Price/spoon"
            className="w-28 rounded-full border border-zinc-300 px-3 py-1.5 dark:border-zinc-700 dark:bg-zinc-900"
          />
          <button
            type="button"
            disabled={addingItem}
            onClick={handleAddItem}
            className="rounded-full bg-brand-red px-4 py-2 text-sm font-medium text-white disabled:opacity-40 dark:bg-brand-red-bright"
          >
            Add item
          </button>
        </div>
        {addItemError && (
          <p className="mt-2 text-sm text-brand-red dark:text-red-400">{addItemError}</p>
        )}
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="mb-1 font-bold text-black dark:text-zinc-50">Delivery fees</h2>
        <p className="mb-3 text-sm text-zinc-600 dark:text-zinc-400">
          Leave a destination blank if this cafeteria doesn&apos;t deliver there.
        </p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {destinations.map((d) => (
            <label key={d.id} className="flex items-center justify-between gap-2 text-sm">
              <span className="text-black dark:text-zinc-50">{d.name}</span>
              <input
                type="number"
                min={0}
                step="0.01"
                value={feeInputs[d.id] ?? ""}
                onChange={(e) =>
                  setFeeInputs((prev) => ({ ...prev, [d.id]: e.target.value }))
                }
                className="w-24 rounded-full border border-zinc-300 px-3 py-1.5 dark:border-zinc-700 dark:bg-zinc-900"
              />
            </label>
          ))}
        </div>
        <button
          type="button"
          disabled={savingFees}
          onClick={handleSaveFees}
          className="mt-3 rounded-full bg-brand-red px-4 py-2 text-sm font-medium text-white disabled:opacity-40 dark:bg-brand-red-bright"
        >
          Save fees
        </button>
        {feeSaved && <p className="mt-2 text-sm text-success dark:text-green-400">Saved.</p>}
        {feeError && <p className="mt-2 text-sm text-brand-red dark:text-red-400">{feeError}</p>}
      </section>
    </div>
  );
}
