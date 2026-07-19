"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatMoney } from "@/lib/format";
import { PhotoUpload } from "@/components/cms/photo-upload";

interface CafeteriaRow {
  id: string;
  name: string;
  photo_url: string | null;
  active: boolean;
}

interface ItemRow {
  id: string;
  cafeteria_id: string;
  name: string;
  price_per_spoon: number;
  photo_url: string | null;
  active: boolean;
}

interface Destination {
  id: string;
  name: string;
}

export function MenuManagerApp({ passcode }: { passcode: string }) {
  const supabase = useMemo(() => createClient(), []);

  const [cafeterias, setCafeterias] = useState<CafeteriaRow[]>([]);
  const [loadingCafeterias, setLoadingCafeterias] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [newName, setNewName] = useState("");
  const [newPhoto, setNewPhoto] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [items, setItems] = useState<ItemRow[]>([]);
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [feeInputs, setFeeInputs] = useState<Record<string, string>>({});
  const [loadingDetail, setLoadingDetail] = useState(false);

  const [newItemName, setNewItemName] = useState("");
  const [newItemPrice, setNewItemPrice] = useState("");
  const [newItemPhoto, setNewItemPhoto] = useState<string | null>(null);
  const [addingItem, setAddingItem] = useState(false);
  const [addItemError, setAddItemError] = useState<string | null>(null);

  const [savingFees, setSavingFees] = useState(false);
  const [feeSaved, setFeeSaved] = useState(false);
  const [feeError, setFeeError] = useState<string | null>(null);

  const selected = cafeterias.find((c) => c.id === selectedId) ?? null;

  async function loadCafeterias() {
    setLoadingCafeterias(true);
    const { data } = await supabase.rpc("menu_manager_list_cafeterias", { p_passcode: passcode });
    setCafeterias((data as CafeteriaRow[]) ?? []);
    setLoadingCafeterias(false);
  }

  useEffect(() => {
    loadCafeterias();
    supabase
      .from("delivery_destinations")
      .select("id, name")
      .order("name")
      .then(({ data }) => setDestinations(data ?? []));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function selectCafeteria(id: string) {
    setSelectedId(id);
    setLoadingDetail(true);
    setFeeSaved(false);
    setFeeError(null);

    const [{ data: itemRows }, { data: feeRows }] = await Promise.all([
      supabase.rpc("menu_manager_list_items", { p_passcode: passcode, p_cafeteria_id: id }),
      supabase.from("delivery_fees").select("destination_id, fee").eq("cafeteria_id", id),
    ]);

    setItems((itemRows as ItemRow[]) ?? []);
    const inputs: Record<string, string> = {};
    for (const row of feeRows ?? []) {
      inputs[row.destination_id] = String(row.fee);
    }
    setFeeInputs(inputs);
    setLoadingDetail(false);
  }

  async function handleCreateCafeteria() {
    if (!newName.trim()) {
      setCreateError("Enter a cafeteria name.");
      return;
    }
    setCreating(true);
    setCreateError(null);

    const { data, error } = await supabase.rpc("menu_manager_upsert_cafeteria", {
      p_passcode: passcode,
      p_id: null,
      p_name: newName.trim(),
      p_photo_url: newPhoto,
      p_active: true,
    });

    setCreating(false);

    if (error || !data) {
      setCreateError(error?.message ?? "Couldn't create cafeteria.");
      return;
    }

    setNewName("");
    setNewPhoto(null);
    await loadCafeterias();
    selectCafeteria(data as string);
  }

  async function updateSelectedCafeteria(fields: Partial<{ name: string; photo_url: string | null; active: boolean }>) {
    if (!selected) return;
    const next = { ...selected, ...fields };
    await supabase.rpc("menu_manager_upsert_cafeteria", {
      p_passcode: passcode,
      p_id: selected.id,
      p_name: next.name,
      p_photo_url: next.photo_url,
      p_active: next.active,
    });
    setCafeterias((prev) => prev.map((c) => (c.id === selected.id ? { ...c, ...fields } : c)));
  }

  async function updateItem(item: ItemRow, fields: Partial<Omit<ItemRow, "id" | "cafeteria_id">>) {
    const next = { ...item, ...fields };
    await supabase.rpc("menu_manager_upsert_item", {
      p_passcode: passcode,
      p_id: item.id,
      p_cafeteria_id: item.cafeteria_id,
      p_name: next.name,
      p_price: next.price_per_spoon,
      p_photo_url: next.photo_url,
      p_active: next.active,
    });
    setItems((prev) => prev.map((i) => (i.id === item.id ? next : i)));
  }

  async function handleAddItem() {
    if (!selectedId) return;
    const price = Number(newItemPrice);
    if (!newItemName.trim() || !price || price <= 0) {
      setAddItemError("Enter a name and a price greater than 0.");
      return;
    }
    setAddingItem(true);
    setAddItemError(null);

    const { data, error } = await supabase.rpc("menu_manager_upsert_item", {
      p_passcode: passcode,
      p_id: null,
      p_cafeteria_id: selectedId,
      p_name: newItemName.trim(),
      p_price: price,
      p_photo_url: newItemPhoto,
      p_active: true,
    });

    setAddingItem(false);

    if (error || !data) {
      setAddItemError(error?.message ?? "Couldn't add item.");
      return;
    }

    setItems((prev) => [
      ...prev,
      {
        id: data as string,
        cafeteria_id: selectedId,
        name: newItemName.trim(),
        price_per_spoon: price,
        photo_url: newItemPhoto,
        active: true,
      },
    ]);
    setNewItemName("");
    setNewItemPrice("");
    setNewItemPhoto(null);
  }

  async function handleSaveFees() {
    if (!selectedId) return;
    setSavingFees(true);
    setFeeError(null);
    setFeeSaved(false);

    const fees = Object.entries(feeInputs)
      .filter(([, value]) => value.trim() !== "")
      .map(([destination_id, value]) => ({ destination_id, fee: Number(value) }));

    if (fees.some((f) => Number.isNaN(f.fee) || f.fee < 0)) {
      setSavingFees(false);
      setFeeError("Fees must be non-negative numbers.");
      return;
    }

    const { error } = await supabase.rpc("menu_manager_upsert_fees", {
      p_passcode: passcode,
      p_cafeteria_id: selectedId,
      p_fees: fees,
    });

    setSavingFees(false);

    if (error) {
      setFeeError(error.message);
      return;
    }

    setFeeSaved(true);
  }

  return (
    <div className="mx-auto flex w-full min-w-0 max-w-2xl flex-col gap-6 px-4 py-6 sm:gap-8 sm:px-6 sm:py-10">
      <div>
        <h1 className="text-2xl font-bold text-[#2C2114]">Menu manager</h1>
        <p className="mt-1 text-sm text-[#2C2114]/70">
          Add cafeterias, items, prices, photos, and delivery fees — no account needed.
        </p>
      </div>

      <section className="rounded-2xl border border-black/5 bg-white p-4 sm:p-5">
        <h2 className="mb-3 font-bold text-[#2C2114]">Add a cafeteria</h2>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
          <div className="flex items-center gap-3 sm:contents">
            <PhotoUpload currentUrl={newPhoto} onUploaded={setNewPhoto} />
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Cafeteria name"
              className="min-w-0 flex-1 rounded-full border border-zinc-300 px-4 py-2"
            />
          </div>
          <button
            type="button"
            disabled={creating}
            onClick={handleCreateCafeteria}
            className="shrink-0 rounded-full bg-brand px-5 py-2 text-sm font-medium text-on-brand disabled:opacity-40"
          >
            {creating ? "Adding…" : "Add"}
          </button>
        </div>
        {createError && <p className="mt-2 text-sm text-error">{createError}</p>}
      </section>

      <section className="rounded-2xl border border-black/5 bg-white p-4 sm:p-5">
        <h2 className="mb-3 font-bold text-[#2C2114]">Cafeterias</h2>
        {loadingCafeterias ? (
          <p className="text-sm text-[#2C2114]/60">Loading…</p>
        ) : cafeterias.length === 0 ? (
          <p className="text-sm text-[#2C2114]/60">No cafeterias yet — add one above.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {cafeterias.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => selectCafeteria(c.id)}
                className={`flex items-center justify-between rounded-xl border px-4 py-2 text-left text-sm transition ${
                  selectedId === c.id
                    ? "border-brand bg-brand-amber-soft"
                    : "border-zinc-200 hover:border-brand/40"
                }`}
              >
                <span className="font-medium text-[#2C2114]">{c.name}</span>
                {!c.active && (
                  <span className="rounded-full bg-zinc-200 px-2 py-0.5 text-xs text-zinc-700">
                    inactive
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </section>

      {selected && (
        <>
          <section className="flex flex-col items-start gap-3 rounded-2xl border border-black/5 bg-white p-4 sm:flex-row sm:items-center sm:gap-4 sm:p-5">
            <div className="flex w-full items-center gap-3 sm:contents">
              <PhotoUpload
                currentUrl={selected.photo_url}
                onUploaded={(url) => updateSelectedCafeteria({ photo_url: url })}
              />
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <input
                  defaultValue={selected.name}
                  key={selected.id}
                  onBlur={(e) => {
                    const value = e.target.value.trim();
                    if (value && value !== selected.name) updateSelectedCafeteria({ name: value });
                  }}
                  className="min-w-0 rounded-full border border-zinc-300 px-4 py-2 text-lg font-medium"
                />
                <label className="flex items-center gap-2 text-sm text-zinc-600">
                  <input
                    type="checkbox"
                    checked={selected.active}
                    onChange={(e) => updateSelectedCafeteria({ active: e.target.checked })}
                  />
                  Active (visible to customers)
                </label>
              </div>
            </div>
          </section>

          {loadingDetail ? (
            <p className="text-sm text-[#2C2114]/60">Loading…</p>
          ) : (
            <>
              <section className="rounded-2xl border border-black/5 bg-white p-4 sm:p-5">
                <h2 className="mb-3 font-bold text-[#2C2114]">Menu items</h2>
                <div className="flex flex-col divide-y divide-black/5">
                  {items.map((item) => (
                    <div
                      key={item.id}
                      className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:gap-3"
                    >
                      <div className="flex items-center gap-3 sm:contents">
                        <PhotoUpload
                          currentUrl={item.photo_url}
                          onUploaded={(url) => updateItem(item, { photo_url: url })}
                        />
                        <input
                          defaultValue={item.name}
                          onBlur={(e) => {
                            const value = e.target.value.trim();
                            if (value && value !== item.name) updateItem(item, { name: value });
                          }}
                          className="min-w-0 flex-1 rounded-full border border-zinc-300 px-3 py-1.5"
                        />
                      </div>
                      <div className="flex items-center gap-3 sm:contents">
                        <input
                          type="number"
                          min={0}
                          step="0.01"
                          defaultValue={item.price_per_spoon}
                          onBlur={(e) => {
                            const value = Number(e.target.value);
                            if (value > 0 && value !== item.price_per_spoon)
                              updateItem(item, { price_per_spoon: value });
                          }}
                          className="w-24 shrink-0 rounded-full border border-zinc-300 px-3 py-1.5"
                        />
                        <label className="flex shrink-0 items-center gap-1 text-xs text-zinc-500">
                          <input
                            type="checkbox"
                            checked={item.active}
                            onChange={(e) => updateItem(item, { active: e.target.checked })}
                          />
                          active
                        </label>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-3 flex flex-col gap-2 border-t border-black/5 pt-3 sm:flex-row sm:items-center sm:gap-3">
                  <div className="flex items-center gap-3 sm:contents">
                    <PhotoUpload currentUrl={newItemPhoto} onUploaded={setNewItemPhoto} label="new item" />
                    <input
                      value={newItemName}
                      onChange={(e) => setNewItemName(e.target.value)}
                      placeholder="Item name"
                      className="min-w-0 flex-1 rounded-full border border-zinc-300 px-3 py-1.5"
                    />
                  </div>
                  <div className="flex items-center gap-3 sm:contents">
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      value={newItemPrice}
                      onChange={(e) => setNewItemPrice(e.target.value)}
                      placeholder="Price/spoon"
                      className="w-28 shrink-0 rounded-full border border-zinc-300 px-3 py-1.5"
                    />
                    <button
                      type="button"
                      disabled={addingItem}
                      onClick={handleAddItem}
                      className="shrink-0 rounded-full bg-brand px-4 py-2 text-sm font-medium text-on-brand disabled:opacity-40"
                    >
                      Add item
                    </button>
                  </div>
                </div>
                {addItemError && <p className="mt-2 text-sm text-error">{addItemError}</p>}
              </section>

              <section className="rounded-2xl border border-black/5 bg-white p-4 sm:p-5">
                <h2 className="mb-1 font-bold text-[#2C2114]">Delivery fees</h2>
                <p className="mb-3 text-sm text-[#2C2114]/70">
                  Leave a destination blank if this cafeteria doesn&apos;t deliver there.
                </p>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {destinations.map((d) => (
                    <label key={d.id} className="flex items-center justify-between gap-2 text-sm">
                      <span className="text-[#2C2114]">{d.name}</span>
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        value={feeInputs[d.id] ?? ""}
                        onChange={(e) =>
                          setFeeInputs((prev) => ({ ...prev, [d.id]: e.target.value }))
                        }
                        className="w-24 rounded-full border border-zinc-300 px-3 py-1.5"
                      />
                    </label>
                  ))}
                </div>
                <button
                  type="button"
                  disabled={savingFees}
                  onClick={handleSaveFees}
                  className="mt-3 rounded-full bg-brand px-4 py-2 text-sm font-medium text-on-brand disabled:opacity-40"
                >
                  Save fees
                </button>
                {feeSaved && <p className="mt-2 text-sm text-success">Saved.</p>}
                {feeError && <p className="mt-2 text-sm text-error">{feeError}</p>}
              </section>

              <p className="tabular-nums text-xs text-[#2C2114]/50">
                Prices shown per spoon, e.g. {formatMoney(500)}.
              </p>
            </>
          )}
        </>
      )}
    </div>
  );
}
