import { OrderStatusLookup } from "@/components/order/order-status-lookup";

export default async function OrderStatusPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <div className="flex flex-1 flex-col bg-zinc-50 px-6 py-10 dark:bg-black">
      <OrderStatusLookup orderId={id} />
    </div>
  );
}
