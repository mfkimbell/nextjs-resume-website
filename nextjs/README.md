This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Talk to the Toucans local voice setup

The portfolio frontend uses Twilio Voice SDK for browser microphone calls.
Copy `.env.example` to `.env` and fill in the Twilio values:

```env
TWILIO_ACCOUNT_SID=...
TWILIO_API_KEY=...
TWILIO_API_KEY_SECRET=...
TWILIO_TWIML_APP_SID=...
TWILIO_SYNC_SERVICE_SID=... # optional, needed for transcript/event logs
TOUCAN_AGENT_NGROK_URL=your-static-domain.ngrok-free.app
NEXT_PUBLIC_TOUCAN_AGENT_NGROK_URL=https://your-static-domain.ngrok-free.app
```

For local ConversationRelay testing, run the agent backend separately, expose it with ngrok, and point the Twilio TwiML App Voice Request URL to:

```txt
https://<TOUCAN_AGENT_NGROK_URL>/call
```

Then run this Next.js app and use the **Talk to the Toucans** button. Call state and Sync transcript events are logged in the browser console.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
