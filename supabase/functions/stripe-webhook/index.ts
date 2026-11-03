// Records a paid purchase when Stripe confirms the payment. Card details never touch this site.
import Stripe from 'https://esm.sh/stripe@14.25.0?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, { apiVersion: '2023-10-16', httpClient: Stripe.createFetchHttpClient() });
const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
const EDITION_BY_LINK: Record<string, string> = {
  [Deno.env.get('STRIPE_LINK_ID_STANDARD') ?? '-']: 'standard',
  [Deno.env.get('STRIPE_LINK_ID_GOLD') ?? '-']: 'gold',
};

Deno.serve(async (req) => {
  const body = await req.text();
  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, req.headers.get('stripe-signature') ?? '', Deno.env.get('STRIPE_WEBHOOK_SECRET')!, undefined, Stripe.createSubtleCryptoProvider());
  } catch { return new Response('bad signature', { status: 400 }); }
  if (event.type === 'checkout.session.completed') {
    const s = event.data.object as Stripe.Checkout.Session;
    const edition = EDITION_BY_LINK[String(s.payment_link ?? '')];
    if (edition && s.client_reference_id && s.payment_status === 'paid') {
      await db.from('purchases').upsert({ user_id: s.client_reference_id, email: s.customer_details?.email ?? '', edition, amount_cents: s.amount_total ?? 0 }, { onConflict: 'user_id', ignoreDuplicates: true });
    }
  }
  return new Response('ok');
});
