import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/lib/db";
import { withinRateLimit } from "@/lib/directory-rfq";
import { InputError, readSmallJson } from "@/lib/onboarding";
import { ownerOrigin, ownerError, OWNER_HEADERS } from "@/lib/owner-access";
import {
  readClaimVerificationToken,
  verifyClaim,
} from "@/lib/claim-verification";
export async function POST(request: NextRequest) {
  try {
    ownerOrigin(request);
    if (
      !(await withinRateLimit(
        request.headers.get("x-forwarded-for")?.split(",")[0] || "unknown",
        "claim-verify",
        20,
        900,
      ))
    )
      throw new InputError("Please wait before trying again.", 429);
    const body = await readSmallJson(request, 1000);
    if (
      !["inspect", "confirm"].includes(body.action) ||
      (body.action === "confirm" && body.confirm_authority !== true)
    )
      throw new InputError(
        "Confirm that you are authorized to manage this shop.",
      );
    return NextResponse.json(
      await verifyClaim(
        getPool(),
        readClaimVerificationToken(body.token),
        body.action === "confirm",
      ),
      { headers: OWNER_HEADERS },
    );
  } catch (e) {
    return ownerError(e);
  }
}
