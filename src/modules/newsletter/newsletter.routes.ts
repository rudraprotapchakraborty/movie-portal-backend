import { Router } from "express";
import { z } from "zod";
import rateLimit from "express-rate-limit";
import { validateRequest } from "../../core/validate-request";
import { Subscriber } from "../../models/Subscriber";

const router = Router();

// Its own budget, so signing up for the newsletter never uses up sign-in attempts
const newsletterLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { success: false, message: "Too many attempts, try again later" },
});

const subscribeSchema = z.object({
  body: z.object({ email: z.email().max(254).transform((v) => v.trim().toLowerCase()) }),
});

/** Same answer whether or not the address was already subscribed. */
router.post("/", newsletterLimiter, validateRequest(subscribeSchema), async (req, res) => {
  await Subscriber.updateOne({ email: req.body.email }, { $setOnInsert: { email: req.body.email } }, { upsert: true });
  res.status(201).json({ success: true, message: "Thanks for subscribing!" });
});

export default router;
