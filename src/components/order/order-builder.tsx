"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { IconCamera, IconCheck } from "@tabler/icons-react";
import { createClient } from "@/lib/supabase/client";
import { formatMoney } from "@/lib/format";
import { PlateSection, type MenuItemOption } from "./plate-section";

interface Destination {
  id: string;
  name: string;
  fee: number;
}

interface OrderBuilderProps {
  cafeteriaId: string;
  menuItems: MenuItemOption[];
  destinations: Destination[];
  bankTransferDetails: string | null;
}

const MAX_PROOF_BYTES = 5 * 1024 * 1024;

function plateTotal(
  spoonCounts: Record<string, number>,
  menuItems: MenuItemOption[]
) {
  return menuItems.reduce((sum, item) => {
    const count = spoonCounts[item.id] ?? 0;
    return sum + count * item.price_per_spoon;
  }, 0);
}

function toLines(spoonCounts: Record<string, number>) {
  return Object.entries(spoonCounts)
    .filter(([, count]) => count > 0)
    .map(([menu_item_id, spoon_count]) => ({ menu_item_id, spoon_count }));
}

export function OrderBuilder({
  cafeteriaId,
  menuItems,
  destinations,
  bankTransferDetails,
}: OrderBuilderProps) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [primary, setPrimary] = useState<Record<string, number>>({});
  const [backup, setBackup] = useState<Record<string, number>>({});
  const [destinationId, setDestinationId] = useState("");
  const [customerContact, setCustomerContact] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);

  const [proofFile, setProofFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [proofSubmitted, setProofSubmitted] = useState(false);

  const primaryTotal = plateTotal(primary, menuItems);
  const backupTotal = plateTotal(backup, menuItems);
  const hasPrimaryItems = primaryTotal > 0;
  const matches = hasPrimaryItems && primaryTotal === backupTotal;
  // Purely a display refinement of the totals already computed above for the
  // match check — doesn't touch what gets sent to create_order.
  const diff = primaryTotal - backupTotal;
  const selectedDestination = destinations.find((d) => d.id === destinationId);
  const grandTotal = primaryTotal + (selectedDestination?.fee ?? 0);

  const canSubmit =
    matches &&
    Boolean(selectedDestination) &&
    customerContact.trim().length > 0 &&
    !submitting;

  async function handlePlaceOrder() {
    if (!selectedDestination) return;
    setSubmitting(true);
    setSubmitError(null);

    const { data, error } = await supabase.rpc("create_order", {
      p_customer_contact: customerContact.trim(),
      p_cafeteria_id: cafeteriaId,
      p_destination_id: selectedDestination.id,
      p_primary_lines: toLines(primary),
      p_backup_lines: toLines(backup),
    });

    setSubmitting(false);

    if (error) {
      setSubmitError(error.message);
      return;
    }

    setOrderId(data as unknown as string);
  }

  async function handleUploadProof() {
    if (!orderId || !proofFile) return;

    if (proofFile.size > MAX_PROOF_BYTES) {
      setUploadError("File is too large — please upload an image under 5MB.");
      return;
    }

    setUploading(true);
    setUploadError(null);

    const path = `${orderId}/${Date.now()}-${proofFile.name}`;
    const { error: uploadErr } = await supabase.storage
      .from("payment-proofs")
      .upload(path, proofFile, { contentType: proofFile.type });

    if (uploadErr) {
      setUploading(false);
      setUploadError(uploadErr.message);
      return;
    }

    const { error: attachErr } = await supabase.rpc("attach_payment_proof", {
      p_order_id: orderId,
      p_proof_url: path,
    });

    setUploading(false);

    if (attachErr) {
      setUploadError(attachErr.message);
      return;
    }

    setProofSubmitted(true);
  }

  if (proofSubmitted && orderId) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-3 rounded-2xl border border-black/5 bg-white p-6 text-center">
        <div className="animate-pop-in flex h-14 w-14 items-center justify-center rounded-full bg-success-soft text-success">
          <IconCheck size={28} stroke={2} />
        </div>
        <h2 className="text-lg font-bold text-[#2C2114]">Payment proof received</h2>
        <p className="text-sm text-[#2C2114]/70">
          We&apos;ll confirm your payment and message you on WhatsApp once
          it&apos;s confirmed. If no courier claims your order right away,
          we&apos;ll follow up to let you know to expect a short wait.
        </p>
        <button
          type="button"
          onClick={() => router.push(`/orders/${orderId}`)}
          className="mt-2 rounded-full bg-brand-red px-5 py-2 text-sm font-medium text-white"
        >
          View order status
        </button>
      </div>
    );
  }

  if (orderId) {
    return (
      <div className="mx-auto flex max-w-md flex-col gap-4 rounded-2xl border border-black/5 bg-white p-6">
        <div className="animate-pop-in flex h-12 w-12 items-center justify-center rounded-full bg-success-soft text-success">
          <IconCheck size={24} stroke={2} />
        </div>
        <h2 className="text-lg font-bold text-[#2C2114]">Pay by bank transfer</h2>
        <p className="text-sm text-[#2C2114]/70">
          Transfer{" "}
          <strong className="tabular-nums">{formatMoney(grandTotal)}</strong>{" "}
          using the account details below, then upload your proof of payment.
        </p>

        {bankTransferDetails ? (
          <pre className="whitespace-pre-wrap rounded-xl bg-brand-amber-soft p-4 text-sm text-brand-amber-text">
            {bankTransferDetails}
          </pre>
        ) : (
          <p className="rounded-xl bg-brand-amber-soft p-4 text-sm text-brand-amber-text">
            Bank transfer details haven&apos;t been configured yet. Contact
            the operator directly to complete payment for order {orderId}.
          </p>
        )}

        <label className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-brand-red/30 bg-cream px-4 py-6 text-center text-sm text-[#2C2114]/80 transition hover:border-brand-red/60">
          <IconCamera size={28} stroke={1.5} className="text-brand-red" />
          <span className="font-medium text-[#2C2114]">
            {proofFile ? proofFile.name : "Upload your payment screenshot"}
          </span>
          <span className="text-xs text-[#2C2114]/50">Tap to choose a file, under 5MB</span>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setProofFile(e.target.files?.[0] ?? null)}
            className="hidden"
          />
        </label>

        {uploadError && <p className="text-sm text-brand-red">{uploadError}</p>}

        <button
          type="button"
          onClick={handleUploadProof}
          disabled={!proofFile || uploading}
          className="rounded-full bg-brand-red px-5 py-2 text-sm font-medium text-white disabled:opacity-40"
        >
          {uploading ? "Uploading…" : "Submit proof of payment"}
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 pb-32">
      <p className="rounded-xl bg-brand-amber-soft p-4 text-sm text-brand-amber-text">
        Pick a backup too — just in case your first choice runs out. We&apos;ll
        only use it if we have to, and it&apos;ll never cost you more.
      </p>

      <PlateSection
        title="Your plate"
        description="Choose your items and how many spoons of each."
        menuItems={menuItems}
        spoonCounts={primary}
        onChange={(id, count) =>
          setPrimary((prev) => ({ ...prev, [id]: count }))
        }
      />

      <div className="flex items-center gap-3" aria-hidden="true">
        <div className="h-0 flex-1 border-t-2 border-dashed border-brand-red/25" />
        <span className="text-xs font-medium uppercase tracking-wide text-brand-red/70">
          Backup selection
        </span>
        <div className="h-0 flex-1 border-t-2 border-dashed border-brand-red/25" />
      </div>

      <PlateSection
        title="Backup plate"
        description="A full backup selection the courier can substitute from if something's unavailable. Its total must match your plate exactly."
        menuItems={menuItems}
        spoonCounts={backup}
        onChange={(id, count) =>
          setBackup((prev) => ({ ...prev, [id]: count }))
        }
      />

      <div
        className={`flex items-center gap-2 rounded-full border px-4 py-3 text-sm font-medium transition-colors duration-200 ${
          matches
            ? "border-success/30 bg-success-soft text-success"
            : "border-brand-amber/30 bg-brand-amber-soft text-brand-amber-text"
        }`}
      >
        {matches ? (
          <>
            <IconCheck key="matched-icon" size={18} stroke={2.5} className="animate-pop-in" />
            <span>
              Backup matches your order:{" "}
              <span className="tabular-nums">{formatMoney(primaryTotal)}</span>
            </span>
          </>
        ) : hasPrimaryItems ? (
          <span className="tabular-nums">
            {diff > 0
              ? `${formatMoney(diff)} more needed to match your order`
              : `${formatMoney(-diff)} too much on your backup plate — remove some items`}
          </span>
        ) : (
          <span>Start your plate above, then match it with a backup.</span>
        )}
      </div>

      <section className="rounded-2xl border border-black/5 bg-white p-5">
        <h2 className="font-bold text-[#2C2114]">Delivery destination</h2>
        <select
          value={destinationId}
          onChange={(e) => setDestinationId(e.target.value)}
          className="mt-3 w-full rounded-full border border-zinc-300 bg-white px-4 py-2 text-[#2C2114]"
        >
          <option value="">Select a destination…</option>
          {destinations.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name} — {formatMoney(d.fee)} delivery
            </option>
          ))}
        </select>
        {destinations.length === 0 && (
          <p className="mt-2 text-sm text-[#2C2114]/60">
            Not currently deliverable from this cafeteria.
          </p>
        )}
      </section>

      <section className="rounded-2xl border border-black/5 bg-white p-5">
        <label className="flex flex-col gap-1 text-sm text-[#2C2114]">
          Your phone number
          <input
            type="tel"
            value={customerContact}
            onChange={(e) => setCustomerContact(e.target.value)}
            placeholder="e.g. 080XXXXXXXX"
            className="rounded-full border border-zinc-300 px-4 py-2"
          />
        </label>
        <p className="mt-1 text-xs text-[#2C2114]/50">
          Used to send your WhatsApp confirmation and to look up your order status.
        </p>
      </section>

      <div className="fixed inset-x-0 bottom-0 border-t border-black/5 bg-cream/95 p-4 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-4">
          <div className="text-sm text-[#2C2114]">
            <p className="text-[#2C2114]/60">Total</p>
            <p className="text-lg font-bold tabular-nums">{formatMoney(grandTotal)}</p>
          </div>
          <button
            type="button"
            onClick={handlePlaceOrder}
            disabled={!canSubmit}
            className="rounded-full bg-brand-red px-6 py-3 text-sm font-medium text-white shadow-sm disabled:opacity-40"
          >
            {submitting ? "Placing order…" : "Place order"}
          </button>
        </div>
        {submitError && (
          <p className="mx-auto mt-2 max-w-2xl text-sm text-brand-red">{submitError}</p>
        )}
      </div>
    </div>
  );
}
