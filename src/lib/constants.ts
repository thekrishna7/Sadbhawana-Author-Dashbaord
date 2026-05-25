export const PUBLISHING_STAGES = [
  { key: "submitted", label: "Submitted", order: 0 },
  { key: "review", label: "Review", order: 1 },
  { key: "editing", label: "Editing", order: 2 },
  { key: "designing", label: "Designing", order: 3 },
  { key: "isbn_processing", label: "ISBN Processing", order: 4 },
  { key: "printing", label: "Printing", order: 5 },
  { key: "published", label: "Published", order: 6 },
] as const;

export type PublishingStageKey = (typeof PUBLISHING_STAGES)[number]["key"];

export const STAGE_COLORS: Record<string, string> = {
  submitted: "from-slate-500 to-slate-600",
  review: "from-violet-500 to-purple-600",
  editing: "from-blue-500 to-cyan-600",
  designing: "from-pink-500 to-rose-600",
  isbn_processing: "from-amber-500 to-orange-600",
  printing: "from-emerald-500 to-teal-600",
  published: "from-green-400 to-emerald-500",
};

export const ADMIN_NAV = [
  { href: "/admin", label: "Overview", icon: "LayoutDashboard" },
  { href: "/admin/authors", label: "Authors", icon: "Users" },
  { href: "/admin/books", label: "Books", icon: "BookOpen" },
  { href: "/admin/profile", label: "Profile", icon: "User" },
] as const;

export const AUTHOR_NAV = [
  { href: "/author", label: "Dashboard", icon: "LayoutDashboard" },
  { href: "/author/books", label: "My Books", icon: "BookOpen" },
  { href: "/author/profile", label: "Profile", icon: "User" },
] as const;

export const STAFF_NAV = [
  { href: "/staff", label: "Dashboard", icon: "LayoutDashboard" },
  { href: "/staff/books", label: "Assigned Books", icon: "BookOpen" },
  { href: "/staff/messages", label: "Messages", icon: "MessageSquare" },
  { href: "/staff/settings", label: "Settings", icon: "Settings" },
] as const;

export const BOOK_TABS = [
  "overview",
  "journey",
  "manuscripts",
  "covers",
  "sales",
  "royalties",
  "messages",
  "documents",
  "timeline",
  "settings",
] as const;

export const AUTHOR_WORKSPACE_TABS = [
  "overview",
  "books",
  "royalties",
  "messages",
  "documents",
  "activity",
] as const;
