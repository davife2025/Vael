import { Router, type Request, type Response } from "express";
import { db } from "../db";

export const billingRouter = Router();

/**
 * POST /v1/billing/webhook
 * Stripe webhook — upgrades API key tier on successful payment.
 *
 * Supported events:
 *   checkout.session.completed → upgrade key to PRO or ENTERPRISE
 *   customer.subscription.deleted → downgrade back to FREE
 *
 * Stripe sends: { type, data: { object: { metadata: { apiKeyId, tier } } } }
 *
 * Set your Stripe webhook secret in .env: STRIPE_WEBHOOK_SECRET=whsec_...
 * Register endpoint in Stripe dashboard: POST https://api.vael.xyz/v1/billing/webhook
 */
billingRouter.post(
  "/webhook",
  // Raw body needed for Stripe signature verification
  // In production: use express.raw({ type: "application/json" }) on this route only
  async (req: Request, res: Response) => {
    const sig     = req.headers["stripe-signature"] as string;
    const secret  = process.env.STRIPE_WEBHOOK_SECRET;

    if (!sig || !secret) {
      return res.status(400).json({ error: "Missing Stripe signature or secret" });
    }

    // In production: verify with stripe.webhooks.constructEvent(req.body, sig, secret)
    // We skip the SDK import here to keep the package lean — add stripe to dependencies
    // when wiring up billing for real.
    const event = req.body as { type: string; data: { object: any } };

    try {
      switch (event.type) {

        case "checkout.session.completed": {
          const session   = event.data.object;
          const apiKeyId  = session.metadata?.apiKeyId  as string | undefined;
          const tier      = session.metadata?.tier       as string | undefined;

          if (!apiKeyId || !tier) break;

          await db.apiKey.update({
            where: { id: apiKeyId },
            data: {
              tier:       tier as any,
              usageLimit: tier === "PRO" ? 100_000 : 999_999_999,
              active:     true,
            },
          });

          console.log(`[billing] Upgraded key ${apiKeyId} to ${tier}`);
          break;
        }

        case "customer.subscription.deleted": {
          const sub      = event.data.object;
          const apiKeyId = sub.metadata?.apiKeyId as string | undefined;
          if (!apiKeyId) break;

          await db.apiKey.update({
            where: { id: apiKeyId },
            data: { tier: "FREE", usageLimit: 1_000 },
          });

          console.log(`[billing] Downgraded key ${apiKeyId} to FREE`);
          break;
        }

        default:
          // Unhandled event type — acknowledge receipt
          break;
      }

      return res.json({ received: true });
    } catch (err) {
      console.error("[billing] Webhook error:", err);
      return res.status(500).json({ error: "Webhook handler failed" });
    }
  }
);

/**
 * GET /v1/billing/plans
 * Returns the current billing plan definitions.
 */
billingRouter.get("/plans", (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: [
      {
        tier:       "FREE",
        label:      "Free",
        price:      0,
        currency:   "USD",
        period:     "forever",
        rateLimit:  1_000,
        features:   ["Agent registry reads", "Ledger queries", "Passport lookups"],
      },
      {
        tier:       "PRO",
        label:      "Pro",
        price:      29,
        currency:   "USD",
        period:     "month",
        rateLimit:  100_000,
        features:   ["100K req/day", "Webhook support", "Usage analytics", "Priority indexing"],
      },
      {
        tier:       "ENTERPRISE",
        label:      "Enterprise",
        price:      null,
        currency:   "USD",
        period:     "custom",
        rateLimit:  null,
        features:   ["Unlimited requests", "Dedicated indexer", "SLA guarantee", "Custom integrations"],
      },
    ],
  });
});
