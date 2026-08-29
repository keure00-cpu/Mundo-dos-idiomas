import { MercadoPagoConfig, Preference } from "mercadopago";
import { createClient } from "@supabase/supabase-js";

const prices = {
  basic: {
    title: "Mundo dos Idiomas - Básico",
    price: 29.90
  },

  premium: {
    title: "Mundo dos Idiomas - Premium",
    price: 59.90
  },

  lifetime: {
    title: "Mundo dos Idiomas - Vitalício",
    price: 99.90
  }
};

export default async function handler(req, res) {

  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Método não permitido"
    });
  }

  try {

    const token =
      req.headers.authorization?.replace("Bearer ", "");

    if (!token) {
      return res.status(401).json({
        error: "Usuário não autenticado"
      });
    }

    const supabaseUser = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_PUBLISHABLE_KEY,
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      }
    );

    const {
      data: { user },
      error
    } = await supabaseUser.auth.getUser();

    if (error || !user) {
      return res.status(401).json({
        error: "Sessão inválida"
      });
    }

    const { plan } = req.body;

    if (!prices[plan]) {
      return res.status(400).json({
        error: "Plano inválido"
      });
    }

    const admin = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SECRET_KEY
    );

    const { data: payment } =
      await admin
        .from("payments")
        .insert({
          user_id: user.id,
          plan: plan,
          status: "pending"
        })
        .select()
        .single();

    const client = new MercadoPagoConfig({
      accessToken:
        process.env.MERCADO_PAGO_ACCESS_TOKEN
    });

    const preference =
      new Preference(client);

    const baseUrl =
      process.env.APP_URL;

    const result =
      await preference.create({
        body: {

          items: [
            {
              title:
                prices[plan].title,

              quantity: 1,

              unit_price:
                prices[plan].price,

              currency_id: "BRL"
            }
          ],

          external_reference:
            String(payment.id),

          notification_url:
            `${baseUrl}/api/webhook`,

          back_urls: {
            success:
              `${baseUrl}/?payment=success`,

            failure:
              `${baseUrl}/?payment=failure`,

            pending:
              `${baseUrl}/?payment=pending`
          }
        }
      });

    return res.status(200).json({
      init_point:
        result.init_point
    });

  } catch (error) {

    console.error(error);

    return res.status(500).json({
      error:
        "Erro ao criar pagamento"
    });

  }

}
