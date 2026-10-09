import {
  Alert,
  AlertTitle,
  AlertDescription,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Avatar,
  AvatarFallback,
  Separator,
  Skeleton,
  ScrollArea,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui";

export function DisplaySection() {
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Card</CardTitle>
            <CardDescription>Notion-register — bg-soft-background, p-6, shadow-xs.</CardDescription>
          </CardHeader>
          <CardContent>Real section-level container used by the bot editor's tabs, Settings.</CardContent>
        </Card>

        <div className="space-y-2">
          <p className="text-sm font-medium">Avatar</p>
          <div className="flex items-center gap-3">
            <Avatar size="sm">
              <AvatarFallback>S</AvatarFallback>
            </Avatar>
            <Avatar>
              <AvatarFallback>M</AvatarFallback>
            </Avatar>
            <Avatar size="lg">
              <AvatarFallback>L</AvatarFallback>
            </Avatar>
          </div>
          <p className="text-xs text-muted-foreground">
            Real usage: <code className="text-xs">AppSidebar.tsx</code>'s footer (sm).
          </p>
        </div>
      </div>

      <div>
        <p className="text-sm font-medium">
          Alert <span className="text-xs font-normal text-muted-foreground">(no real call site yet)</span>
        </p>
        <div className="mt-3 max-w-md space-y-3">
          <Alert>
            <AlertTitle>Heads up</AlertTitle>
            <AlertDescription>A default-variant callout — bg-card, not a toast.</AlertDescription>
          </Alert>
          <Alert variant="destructive">
            <AlertTitle>Something needs attention</AlertTitle>
            <AlertDescription>The destructive variant.</AlertDescription>
          </Alert>
        </div>
      </div>

      <div>
        <p className="text-sm font-medium">Separator</p>
        <div className="mt-3 max-w-xs">
          <p className="text-sm">Above</p>
          <Separator className="my-2" />
          <p className="text-sm">Below</p>
        </div>
      </div>

      <div>
        <p className="text-sm font-medium">Skeleton</p>
        <div className="mt-3 flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-3 w-32" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">Used by every route's loading.tsx.</p>
      </div>

      <div>
        <p className="text-sm font-medium">
          ScrollArea <span className="text-xs font-normal text-muted-foreground">(no real call site yet)</span>
        </p>
        <ScrollArea className="mt-3 h-24 w-64 rounded-md border border-border p-3">
          <p className="text-sm">
            A long block of text that overflows its fixed-height container, scrollable via this real Radix-based
            ScrollArea primitive rather than the browser&apos;s native scrollbar.
          </p>
        </ScrollArea>
      </div>

      <div>
        <p className="text-sm font-medium">Table</p>
        <div className="mt-3 max-w-md overflow-hidden rounded-lg border border-border shadow-xs">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell>Support bot</TableCell>
                <TableCell>Published</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
