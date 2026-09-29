import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { orderSchema } from "@/lib/validators";
import { quoteDelivery } from "@/lib/delivery";
import { verifyUser } from "@/lib/auth";

export async function POST(req: Request) {
  let input: unknown;
  try {
    input = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Dados do pedido inválidos." },
      { status: 400 },
    );
  }
  const parsed = orderSchema.safeParse(input);
  if (!parsed.success)
    return NextResponse.json(
      { error: "Confira os dados do pedido." },
      { status: 400 },
    );
  const payload = parsed.data;
  const customer = await verifyUser();
  const ids = [...new Set(payload.items.map((i) => i.productId))];
  const products = await db.product.findMany({ where: { id: { in: ids } } });
  if (products.length !== ids.length)
    return NextResponse.json(
      { error: "Um ou mais produtos não existem." },
      { status: 400 },
    );
  if (products.some((p) => p.availability === "SOLD_OUT"))
    return NextResponse.json(
      { error: "Um produto do carrinho está esgotado." },
      { status: 409 },
    );

  const subtotalCents = payload.items.reduce((sum, item) => {
    const product = products.find((p) => p.id === item.productId)!;
    return sum + product.priceCents * item.quantity;
  }, 0);

  let deliveryFeeCents = 0;
  let distanceKm: number | null = null;
  if (payload.fulfillmentType === "DELIVERY") {
    distanceKm = Number(payload.distanceKm || 0);
    const quote = await quoteDelivery(distanceKm);
    if (!quote.available)
      return NextResponse.json({ error: quote.message }, { status: 422 });
    deliveryFeeCents = quote.feeCents;
  }

  let discountCents = 0;
  if (payload.couponCode) {
    const coupon = await db.coupon.findFirst({
      where: { code: payload.couponCode.toUpperCase(), active: true },
    });
    if (
      coupon &&
      (!coupon.minSubtotalCents || subtotalCents >= coupon.minSubtotalCents)
    ) {
      discountCents = coupon.percentageOff
        ? Math.floor((subtotalCents * coupon.percentageOff) / 100)
        : Math.min(coupon.fixedOffCents || 0, subtotalCents);
    }
  }

  const totalCents = Math.max(
    0,
    subtotalCents + deliveryFeeCents - discountCents,
  );
  const publicNumber = `#TS-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

  const order = await db.$transaction(async (tx) => {
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
        ? await tx.address.findFirst({
            where: { userId: customer.id, ...addressData },
          })
        : null;
      address ??= await tx.address.create({
        data: {
          userId: customer?.id,
          label: "Pedido",
          ...addressData,
        },
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
        customerEmail: customer?.email ?? payload.customerEmail,
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

  return NextResponse.json({
    order,
    payment: {
      mode: "demo",
      pixCode:
        payload.paymentMethod === "PIX" && order.status === "CONFIRMED"
          ? `00020126580014BR.GOV.BCB.PIX0136trio-sabores-demo-${order.id}520400005303986540${(totalCents / 100).toFixed(2)}`
          : null,
    },
  });
}
