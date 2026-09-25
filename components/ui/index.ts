// Single import path for every shared primitive — one place to look, one
// place to add the next one. Enforced by scripts/check-component-imports.mjs:
// app/ may only import from "@/components/ui", never a specific file
// inside it. See docs/conventions.md.
export { Button, buttonVariants } from "./button";
export { Input } from "./input";
export { Textarea } from "./textarea";
export { Label } from "./label";
export { Checkbox } from "./checkbox";
export { Badge } from "./badge";
export { Toaster } from "./toaster";
export { Card, CardHeader, CardTitle, CardDescription, CardContent } from "./card";

// Pulled verbatim from ohcnetwork/careui (ADR 0008) via
// scripts/pull-care-component.mjs — CARE's exact source, not
// reinterpreted. One-time pull, kept and owned here going forward;
// not re-fetched from their registry on every use.
export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
} from "./dialog";
export {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogOverlay,
  AlertDialogPortal,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "./alert-dialog";
export { Tabs, TabsList, TabsTrigger, TabsContent } from "./tabs";
export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
} from "./table";
export {
  DropdownMenu,
  DropdownMenuPortal,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from "./dropdown-menu";
export {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "./popover";
export { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./tooltip";
export {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectScrollDownButton,
  SelectScrollUpButton,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "./select";
export { Separator } from "./separator";
export { Avatar, AvatarImage, AvatarFallback, AvatarGroup, AvatarGroupCount, AvatarBadge } from "./avatar";
export { Skeleton } from "./skeleton";
export {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInput,
  SidebarInset,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSkeleton,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
  SidebarRail,
  SidebarSeparator,
  SidebarTrigger,
  useSidebar,
} from "./sidebar";
export { Alert, AlertTitle, AlertDescription, AlertAction } from "./alert";
export { Switch } from "./switch";
export { RadioGroup, RadioGroupItem } from "./radio-group";
export {
  Sheet,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetBody,
  SheetFooter,
  SheetTitle,
  SheetDescription,
} from "./sheet";
export { ScrollArea, ScrollBar } from "./scroll-area";
