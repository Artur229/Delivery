import Stripe from "stripe";
import { env } from "../config/env.js";
import { badRequest } from "./errors.js";

export const getStripe = () => {
  if (!env.STRIPE_SECRET_KEY) {
    throw badRequest("Stripe secret key is not configured");
  }

  return new Stripe(env.STRIPE_SECRET_KEY);
};
