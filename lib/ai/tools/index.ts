// Side-effect import: pulls in every built-in tool so it registers
// itself (see registry.ts). Import this module once, wherever the tool
// loop runs, rather than importing individual tool files piecemeal.
import "@/lib/ai/tools/searchKnowledgeBase";
import "@/lib/ai/tools/checkOrderStatus";
