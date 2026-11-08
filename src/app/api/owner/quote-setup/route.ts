import { NextRequest, NextResponse } from "next/server";
import {
  ownerIdentity,
  ownerOrigin,
  ownerError,
  OWNER_HEADERS,
} from "@/lib/owner-access";
import { getPool } from "@/lib/db";
import { readSmallJson, InputError } from "@/lib/onboarding";
import { withinRateLimit } from "@/lib/directory-rfq";
import {
  requestQuoteSetup,
  readQuoteSetupToken,
  confirmQuoteSetup,
} from "@/lib/owner-quote-setup";
export async function POST(request: NextRequest) {
  try {
    ownerOrigin(request);
    const b = await readSmallJson(request, 2000);
    if (b.action === "inspect" || b.action === "confirm") {
      if (b.action === "confirm" && b.confirm !== true)
        throw new InputError("Confirm that you received the delivery test.");
      const id = readQuoteSetupToken(b.token);
      if (!(await withinRateLimit(id, "quote-setup-proof", 20, 900)))
        throw new InputError("Please wait before trying again.", 429);
      return NextResponse.json(
        await confirmQuoteSetup(getPool(), id, b.action === "confirm"),
        { headers: OWNER_HEADERS },
      );
    }
    const owner = await ownerIdentity(request);
    if (b.action !== "request") throw new InputError("Choose a setup action.");
    if (!(await withinRateLimit(owner.id, "quote-setup", 5, 3600)))
      throw new InputError("Please wait before requesting another test.", 429);
    return NextResponse.json(await requestQuoteSetup(getPool(), owner, b), {
      headers: OWNER_HEADERS,
    });
  } catch (e) {
    return ownerError(e);
  }
}
