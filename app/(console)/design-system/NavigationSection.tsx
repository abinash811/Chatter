import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui";
import { ToastDemoButton } from "./ToastDemoButton";

export function NavigationSection() {
  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm font-medium">Tabs</p>
        <Tabs defaultValue="persona" className="mt-3">
          <TabsList>
            <TabsTrigger value="persona">Persona</TabsTrigger>
            <TabsTrigger value="tools">Tools</TabsTrigger>
          </TabsList>
          <TabsContent value="persona" className="mt-4 text-sm text-muted-foreground">
            Real usage: the bot editor's Persona/Guardrails/Tools/Appearance tabs.
          </TabsContent>
          <TabsContent value="tools" className="mt-4 text-sm text-muted-foreground">
            200ms fade on switch (TabsContent's one documented delta from shadcn's stock source).
          </TabsContent>
        </Tabs>
      </div>

      <div>
        <p className="text-sm font-medium">Toaster</p>
        <div className="mt-3">
          <ToastDemoButton />
        </div>
      </div>

      <div>
        <p className="text-sm font-medium">Sidebar</p>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Not re-demoed in isolation here — you&apos;re looking at its real instance right now, on the left. See{" "}
          <code className="text-xs">components/console/AppSidebar.tsx</code>.
        </p>
      </div>
    </div>
  );
}
