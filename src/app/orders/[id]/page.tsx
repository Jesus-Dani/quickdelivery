import { OrderStatusLookup } from "@/components/order/order-status-lookup";

export default async function OrderStatusPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <div className="flex flex-1 flex-col items-center bg-cream px-6 py-16">
      <OrderStatusLookup orderId={id} />
    </div>
  );
}
