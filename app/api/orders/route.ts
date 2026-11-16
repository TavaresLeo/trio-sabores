import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { orderSchema } from "@/lib/validators";
import { quoteDelivery } from "@/lib/delivery";
import { verifyUser } from "@/lib/auth";
import {
  NO_STORE,
  clientIp,
  crossOriginRejected,
  isSameOrigin,
  jsonError,
  newRequestId,
  rateLimitUnavailable,
  rateLimited,
  serverError,
} from "@/lib/http";
import { RATE_LIMITS, RateLimitUnavailableError, rateLimitKey, registerRateLimitAttempt } from "@/lib/rate-limit";

function paymentPayload(order: { id: string; totalCents: number }, paymentMethod: string) {
  return {
    mode: "demo" as const,
    pixCode:
      paymentMethod === "PIX"
        ? `00020126580014BR.GOV.BCB.PIX0136trio-sabores-demo-${order.id}520400005303986540${(
            order.totalCents / 100
          ).toFixed(2)}`
        : null,
  };
}

export async function POST(req: Request) {
  const requestId = newRequestId();

  if (!isSameOrigin(req)) return crossOriginRejected(requestId);

  try {
    const limit = await registerRateLimitAttempt(
      rateLimitKey("order:ip", clientIp(req)),
      RATE_LIMITS.order,
    );
    if (!limit.allowed) return rateLimited(limit.retryAfterSeconds, requestId);
  } catch (error) {
    if (error instanceof RateLimitUnavailableError) return rateLimitUnavailable(requestId);
    return serverError(requestId, "order_rate_limit", error);
  }

  let input: unknown;
  try {
    input = await req.json();
  } catch {
    return jsonError("Dados do pedido inválidos.", 400);
  }
  const parsed = orderSchema.safeParse(input);
  if (!parsed.success) {
    const details = parsed.error.issues.map((issue) => ({
      field: issue.path.map(String).join("."),
      message: issue.message,
    }));
    return NextResponse.json(
      {
        error: details.length
          ? `Confira os dados do pedido: ${details.map((issue) => `${issue.field}: ${issue.message}`).join(" ")}`
          : "Confira os dados do pedido.",
        details,
      },
      { status: 400 },
    );
  }
  const payload = parsed.data;

  let customer: Awaited<ReturnType<typeof verifyUser>> = null;
  try {
    customer = await verifyUser();
  } catch (error) {
    return serverError(requestId, "order_verify_user", error);
  }

  const ids = [...new Set(payload.items.map((i) => i.productId))];
  const products = await db.product.findMany({ where: { id: { in: ids } } });
  if (products.length !== ids.length) return jsonError("Um ou mais produtos não existem.", 400);
  if (products.some((p) => p.availability === "SOLD_OUT")) {
    return jsonError("Um produto do carrinho está esgotado.", 409);
  }

  const subtotalCents = payload.items.reduce((sum, item) => {
    const product = products.find((p) => p.id === item.productId)!;
    return sum + product.priceCents * item.quantity;
  }, 0);

  let deliveryFeeCents = 0;
  let distanceKm: number | null = null;
  if (payload.fulfillmentType === "DELIVERY") {
    distanceKm = Number(payload.distanceKm || 0);
    const quote = await quoteDelivery(distanceKm);
    if (!quote.available) return jsonError(quote.message, 422);
    deliveryFeeCents = quote.feeCents;
  }

  let discountCents = 0;
  if (payload.couponCode) {
    const now = new Date();
    const coupon = await db.coupon.findFirst({
      where: {
        code: payload.couponCode.trim().toUpperCase(),
        active: true,
        AND: [
          { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
          { OR: [{ endsAt: null }, { endsAt: { gte: now } }] },
        ],
      },
    });
    if (coupon && (!coupon.minSubtotalCents || subtotalCents >= coupon.minSubtotalCents)) {
      discountCents = coupon.percentageOff
        ? Math.floor((subtotalCents * coupon.percentageOff) / 100)
        : Math.min(coupon.fixedOffCents || 0, subtotalCents);
    }
  }

  const totalCents = Math.max(0, subtotalCents + deliveryFeeCents - discountCents);
  const customerEmail = (customer?.email ?? payload.customerEmail).trim().toLowerCase();

  // Proteção contra duplo clique / reenvio da mesma finalização.
  const recentOrders = await db.order.findMany({
    where: {
      customerEmail,
      totalCents,
      createdAt: { gte: new Date(Date.now() - 60_000) },
    },
    orderBy: { createdAt: "desc" },
    take: 3,
    include: { items: { select: { productId: true, quantity: true } } },
  });
  const signature = (items: Array<{ productId: string; quantity: number }>) =>
    items
      .map((item) => `${item.productId}:${item.quantity}`)
      .sort()
      .join("|");
  const requestSignature = signature(payload.items);
  const duplicate = recentOrders.find((order) => signature(order.items) === requestSignature);
  if (duplicate) {
    return NextResponse.json(
      { order: duplicate, payment: paymentPayload(duplicate, duplicate.paymentMethod) },
      { status: 200, headers: { ...NO_STORE, "x-request-id": requestId } },
    );
  }

  const publicNumber = `#TS-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

  const createOrder = () =>
    db.$transaction(async (tx) => {
      let address: { id: string } | null = null;
      if (payload.fulfillmentType === "DELIVERY" && payload.address) {
        const addressData = {
          cep: payload.address.cep || "",
          street: payload.address.street || "",
          number: payload.address.number || "",
          complement: payload.address.complement || null,
          neighborhood: payload.address.neighborhood || "",
          city: payload.address.city || "",
          state: payload.address.state || "",
        };
        address = customer
          ? await tx.address.findFirst({ where: { userId: customer.id, ...addressData } })
          : null;
        address ??= await tx.address.create({
          data: { userId: customer?.id, label: "Pedido", ...addressData },
        });
      }

      return tx.order.create({
        data: {
          publicNumber,
          userId: customer?.id,
          fulfillmentType: payload.fulfillmentType,
          status: payload.fulfillmentType === "DELIVERY" ? "PENDING" : "CONFIRMED",
          paymentMethod: payload.paymentMethod,
          paymentStatus: "PENDING",
          subtotalCents,
          deliveryFeeCents,
          discountCents,
          totalCents,
          distanceKm: distanceKm ?? undefined,
          notes: payload.notes,
          customerName: customer?.name ?? payload.customerName,
          customerEmail,
          customerPhone: customer?.phone ?? payload.customerPhone,
          cashChangeForCents: payload.cashChangeForCents,
          addressId: address?.id,
          items: {
            create: payload.items.map((item) => {
              const product = products.find((p) => p.id === item.productId)!;
              return {
                productId: product.id,
                productName: product.name,
                quantity: item.quantity,
                unitPriceCents: product.priceCents,
                subtotalCents: product.priceCents * item.quantity,
              };
            }),
          },
        },
        include: { items: true },
      });
    });

  let order: Awaited<ReturnType<typeof createOrder>>;
  try {
    order = await createOrder();
  } catch (error) {
    return serverError(requestId, "order_create", error);
  }

  return NextResponse.json(
    { order, payment: paymentPayload(order, payload.paymentMethod) },
    { headers: { ...NO_STORE, "x-request-id": requestId } },
  );
}
