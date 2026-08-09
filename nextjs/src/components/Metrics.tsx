"use client";

import AirplaneTracking from "./AirplaneTracking";
import ContactSign from "./ContactSign";

const DISABLED_SITE_METRICS = {
  visits: 0,
  clicks: 0,
  mouseMiles: 0,
} as const;

export default function Metrics() {
  return (
    <section
      id="metrics"
      className="relative mt-12 overflow-hidden pb-12"
      style={{
        touchAction: "pan-y",
        overscrollBehavior: "auto",
      }}
    >
      <AirplaneTracking className="pointer-events-none absolute inset-0 z-20 overflow-hidden" />

      <ContactSign
        visits={DISABLED_SITE_METRICS.visits}
        clicks={DISABLED_SITE_METRICS.clicks}
        mouseMiles={DISABLED_SITE_METRICS.mouseMiles}
      />
    </section>
  );
}
