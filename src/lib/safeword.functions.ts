import { createServerFn } from "@tanstack/react-start";
import { createHmac } from "crypto";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Returns a per-user pepper derived from a server-only secret.
// Mixed into the client-side PBKDF2 input so a DB dump alone cannot
// reproduce the AES-GCM key for the safe word ciphertext.
export const getSafewordPepper = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const pepper = process.env.SAFEWORD_PEPPER;
    if (!pepper) throw new Error("Safe word service is not configured.");
    const mac = createHmac("sha256", pepper).update(context.userId).digest("base64");
    return { pepper: mac };
  });
