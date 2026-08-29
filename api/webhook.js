import { MercadoPagoConfig, Payment } from "mercadopago";
import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {

  try {

    if (req.method === "GET") {
      return res.status(200).json({
        status: "online"
      });
    }

    const paymentId =
      req.body?.data?.id ||
      req.query?.["data.id"];

    if (!paymentId) {
      return res.status(200).json({
        received: true
      });
    }

    const client =
      new MercadoPagoConfig({
        accessToken:
          process.env.MERCADO_PAGO_ACCESS_TOKEN
      });

    const paymentClient =
      new Payment(client);

    const payment =
      await paymentClient.get({
        id: paymentId
      });

    if (
      payment.status !== "approved"
    ) {
      return res.status(200).json({
        received: true
      });
    }

    const reference =
      payment.external_reference;

    if (!reference) {
      return res.status(200).json({
        received: true
      });
    }

    const supabase =
      createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SECRET_KEY
      );

    const { data: order } =
      await supabase
        .from("payments")
        .select("*")
        .eq("id", reference)
        .single();

    if (!order) {
      return res.status(404).json({
        error: "Pedido não encontrado"
      });
    }

    await supabase
      .from("payments")
      .update({
        status: "approved",
        payment_id: String(paymentId)
      })
      .eq("id", order.id);

    await supabase
      .from("profiles")
      .upsert({
        id: order.user_id,
        plan: order.plan
      });

    return res.status(200).json({
      success: true
    });

  } catch (error) {

    console.error(error);

    return res.status(500).json({
      error: "Webhook error"
    });

  }

}
