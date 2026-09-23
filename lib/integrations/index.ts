// Side-effect import: pulls in every integration adapter so it registers
// itself (see provider.ts). Import this once, wherever integrations are
// initiated or resolved — mirrors lib/ai/tools/index.ts.
import "@/lib/integrations/shopify";
