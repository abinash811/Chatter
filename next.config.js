/** @type {import('next').NextConfig} */
module.exports = {
  experimental: {
    serverActions: {
      // Headroom over lib/ai/extraction.ts's own 5MB MAX_FILE_BYTES check
      // (ADR 0013, file/URL knowledge ingestion) — a file over that app-
      // level cap should hit our own plain-language error, not this
      // framework-level limit's generic rejection.
      bodySizeLimit: "6mb",
    },
  },
};
