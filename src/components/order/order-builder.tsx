"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
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
      <div className="mx-auto max-w-md rounded-lg border border-zinc-200 bg-white p-6 text-center dark:border-zinc-800 dark:bg-zinc-950">
        <h2 className="text-lg font-medium text-black dark:text-zinc-50">
          Payment proof received
        </h2>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          We&apos;ll confirm your payment and send a WhatsApp message to{" "}
          {customerContact}. If no courier claims your order right away,
          we&apos;ll follow up to let you know to expect a short wait.
        </p>
        <button
          type="button"
          onClick={() => router.push(`/orders/${orderId}`)}
          className="mt-4 rounded-full bg-black px-5 py-2 text-sm font-medium text-white dark:bg-white dark:text-black"
        >
          View order status
        </button>
      </div>
    );
  }

  if (orderId) {
    return (
      <div className="mx-auto flex max-w-md flex-col gap-4 rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
        <h2 className="text-lg font-medium text-black dark:text-zinc-50">
          Pay by bank transfer
        </h2>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Transfer <strong>{formatMoney(grandTotal)}</strong> using the
          account details below, then upload your proof of payment.
        </p>

        {process.env.NEXT_PUBLIC_BANK_TRANSFER_DETAILS ? (
          <pre className="whitespace-pre-wrap rounded bg-zinc-100 p-3 text-sm text-black dark:bg-zinc-900 dark:text-zinc-50">
            {process.env.NEXT_PUBLIC_BANK_TRANSFER_DETAILS}
          </pre>
        ) : (
          <p className="rounded bg-amber-100 p-3 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-200">
            Bank transfer details haven&apos;t been configured yet. Contact
            the operator directly to complete payment for order {orderId}.
          </p>
        )}

        <label className="flex flex-col gap-1 text-sm text-black dark:text-zinc-50">
          Proof of payment (screenshot or photo)
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setProofFile(e.target.files?.[0] ?? null)}
            className="text-sm"
          />
        </label>

        {uploadError && (
          <p className="text-sm text-red-600 dark:text-red-400">{uploadError}</p>
        )}

        <button
          type="button"
          onClick={handleUploadProof}
          disabled={!proofFile || uploading}
          className="rounded-full bg-black px-5 py-2 text-sm font-medium text-white disabled:opacity-40 dark:bg-white dark:text-black"
        >
          {uploading ? "Uploading…" : "Submit proof of payment"}
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 pb-32">
      <PlateSection
        title="Your plate"
        description="Choose your items and how many spoons of each."
        menuItems={menuItems}
        spoonCounts={primary}
        onChange={(id, count) =>
          setPrimary((prev) => ({ ...prev, [id]: count }))
        }
      />

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
        className={`rounded-lg border p-4 text-sm ${
          matches
            ? "border-green-300 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-950 dark:text-green-300"
            : "border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300"
        }`}
      >
        {matches ? (
          <p>✓ Backup plate matches your plate total: {formatMoney(primaryTotal)}</p>
        ) : (
          <p>
            Backup plate total ({formatMoney(backupTotal)}) must equal your
            plate total ({formatMoney(primaryTotal)}) before you can check out.
          </p>
        )}
      </div>

      <section className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
        <h2 className="font-medium text-black dark:text-zinc-50">
          Delivery destination
        </h2>
        <select
          value={destinationId}
          onChange={(e) => setDestinationId(e.target.value)}
          className="mt-3 w-full rounded border border-zinc-300 bg-white px-3 py-2 text-black dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        >
          <option value="">Select a destination…</option>
          {destinations.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name} — {formatMoney(d.fee)} delivery
            </option>
          ))}
        </select>
        {destinations.length === 0 && (
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            No delivery destinations are configured for this cafeteria yet.
          </p>
        )}
      </section>

      <section className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
        <label className="flex flex-col gap-1 text-sm text-black dark:text-zinc-50">
          Your phone number
          <input
            type="tel"
            value={customerContact}
            onChange={(e) => setCustomerContact(e.target.value)}
            placeholder="e.g. 080XXXXXXXX"
            className="rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
          />
        </label>
        <p className="mt-1 text-xs text-zinc-500">
          Used to send your WhatsApp confirmation and to look up your order status.
        </p>
      </section>

      <div className="fixed inset-x-0 bottom-0 border-t border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-4">
          <div className="text-sm text-black dark:text-zinc-50">
            <p className="text-zinc-600 dark:text-zinc-400">Total</p>
            <p className="font-medium">{formatMoney(grandTotal)}</p>
          </div>
          <button
            type="button"
            onClick={handlePlaceOrder}
            disabled={!canSubmit}
            className="rounded-full bg-black px-6 py-3 text-sm font-medium text-white disabled:opacity-40 dark:bg-white dark:text-black"
          >
            {submitting ? "Placing order…" : "Place order"}
          </button>
        </div>
        {submitError && (
          <p className="mx-auto mt-2 max-w-2xl text-sm text-red-600 dark:text-red-400">
            {submitError}
          </p>
        )}
      </div>
    </div>
  );
}
