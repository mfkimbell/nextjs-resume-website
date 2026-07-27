import { NextResponse } from "next/server";
import twilio from "twilio";

export const runtime = "nodejs";

type MissingEnv = {
  name: string;
  aliases?: string[];
};

const getEnv = (...names: string[]) => {
  for (const name of names) {
    const value = process.env[name];
    if (value) return value;
  }
  return undefined;
};

const missing = (items: MissingEnv[]) =>
  items
    .filter(({ name, aliases = [] }) => !getEnv(name, ...aliases))
    .map(({ name, aliases = [] }) => [name, ...aliases].join(" or "));

export async function GET(request: Request) {
  const missingEnv = missing([
    { name: "TWILIO_ACCOUNT_SID" },
    { name: "TWILIO_API_KEY", aliases: ["TWILIO_API_KEY_SID"] },
    { name: "TWILIO_API_KEY_SECRET", aliases: ["TWILIO_API_SECRET"] },
    { name: "TWILIO_TWIML_APP_SID" },
  ]);

  if (missingEnv.length > 0) {
    return NextResponse.json(
      { error: "Missing Twilio voice token configuration", missing: missingEnv },
      { status: 500 }
    );
  }

  const url = new URL(request.url);
  const requestedIdentity = url.searchParams.get("identity")?.trim();
  const identity = requestedIdentity || `toucan-visitor-${Date.now()}`;
  const ttl = Number(process.env.TWILIO_ACCESS_TOKEN_TTL || 3600);

  const voiceGrant = new twilio.jwt.AccessToken.VoiceGrant({
    outgoingApplicationSid: getEnv("TWILIO_TWIML_APP_SID")!,
    incomingAllow: false,
  });

  const accessToken = new twilio.jwt.AccessToken(
    getEnv("TWILIO_ACCOUNT_SID")!,
    getEnv("TWILIO_API_KEY", "TWILIO_API_KEY_SID")!,
    getEnv("TWILIO_API_KEY_SECRET", "TWILIO_API_SECRET")!,
    { identity, ttl }
  );

  accessToken.addGrant(voiceGrant);

  return NextResponse.json({ identity, token: accessToken.toJwt() });
}
