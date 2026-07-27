import { NextResponse } from "next/server";
import twilio from "twilio";

export const runtime = "nodejs";

const getEnv = (...names: string[]) => {
  for (const name of names) {
    const value = process.env[name];
    if (value) return value;
  }
  return undefined;
};

export async function GET(request: Request) {
  const accountSid = getEnv("TWILIO_ACCOUNT_SID");
  const apiKey = getEnv("TWILIO_API_KEY", "TWILIO_API_KEY_SID");
  const apiSecret = getEnv("TWILIO_API_KEY_SECRET", "TWILIO_API_SECRET");
  const syncServiceSid = getEnv("TWILIO_SYNC_SERVICE_SID");

  const missing = [
    !accountSid && "TWILIO_ACCOUNT_SID",
    !apiKey && "TWILIO_API_KEY or TWILIO_API_KEY_SID",
    !apiSecret && "TWILIO_API_KEY_SECRET or TWILIO_API_SECRET",
    !syncServiceSid && "TWILIO_SYNC_SERVICE_SID",
  ].filter(Boolean);

  if (missing.length > 0) {
    return NextResponse.json(
      { error: "Missing Twilio Sync token configuration", missing },
      { status: 500 }
    );
  }

  const url = new URL(request.url);
  const identity =
    url.searchParams.get("identity")?.trim() || `toucan-observer-${Date.now()}`;
  const ttl = Number(process.env.TWILIO_ACCESS_TOKEN_TTL || 3600);

  const syncGrant = new twilio.jwt.AccessToken.SyncGrant({
    serviceSid: syncServiceSid!,
  });

  const accessToken = new twilio.jwt.AccessToken(accountSid!, apiKey!, apiSecret!, {
    identity,
    ttl,
  });
  accessToken.addGrant(syncGrant);

  return NextResponse.json({ identity, token: accessToken.toJwt() });
}
