"use server";

import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import Stripe from "stripe";

import { db } from "@/db";
import { orderItemTable, orderTable } from "@/db/schema";
import { auth } from "@/lib/auth";

import {
  CreateCheckoutSessionSchema,
  createCheckoutSessionSchema,
} from "./schema";

// ✅ Função para garantir URLs válidas e absolutas
function makeAbsoluteUrl(path: string) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  try {
    const cleanedPath = path.replace(/[{}"]/g, ""); // Limpa caracteres problemáticos
    return new URL(cleanedPath, baseUrl).toString();
  } catch {
    throw new Error(`URL inválida: base=${baseUrl}, path=${path}`);
  }
}

export const createCheckoutSession = async (
  data: CreateCheckoutSessionSchema,
) => {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error("Stripe secret key is not set");
  }

  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session?.user) {
    throw new Error("Unauthorized");
  }

  const { orderId } = createCheckoutSessionSchema.parse(data);

  const order = await db.query.orderTable.findFirst({
    where: eq(orderTable.id, orderId),
  });
  if (!order) {
    throw new Error("Order not found");
  }
  if (order.userId !== session.user.id) {
    throw new Error("Unauthorized");
  }

  const orderItems = await db.query.orderItemTable.findMany({
    where: eq(orderItemTable.orderId, orderId),
    with: {
      productVariant: { with: { product: true } },
    },
  });

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

  const checkoutSession = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    mode: "payment",
    success_url: makeAbsoluteUrl("/checkout/success"),
    cancel_url: makeAbsoluteUrl("/checkout/cancel"),
    metadata: {
      orderId,
    },
    line_items: orderItems.map((orderItem) => {
      const cleanImageUrl = orderItem.productVariant.imageUrl
        ? orderItem.productVariant.imageUrl.replace(/[{}"]/g, "")
        : "";

      const imageUrl = cleanImageUrl
        ? makeAbsoluteUrl(cleanImageUrl)
        : makeAbsoluteUrl("/default-image.png"); // imagem padrão se não houver

      return {
        price_data: {
          currency: "brl",
          product_data: {
            name: `${orderItem.productVariant.product.name} - ${orderItem.productVariant.name}`,
            description: orderItem.productVariant.product.description,
            images: [imageUrl],
          },
          unit_amount: orderItem.priceInCents,
        },
        quantity: orderItem.quantity,
      };
    }),
  });

  return checkoutSession;
};
