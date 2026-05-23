export type UserRole = "super_admin" | "staff" | "author";
export type AccountStatus = "active" | "suspended" | "pending";
export type PublishingStage =
  | "submitted"
  | "review"
  | "editing"
  | "designing"
  | "isbn_processing"
  | "printing"
  | "published";

export interface Profile {
  id: string;
  role: UserRole;
  email: string;
  full_name: string;
  avatar_url: string | null;
  banner_url: string | null;
  bio: string | null;
  about_author: string | null;
  social_links: Record<string, string>;
  website: string | null;
  phone: string | null;
  bank_account_name: string | null;
  bank_account_number: string | null;
  bank_ifsc: string | null;
  bank_upi: string | null;
  status: AccountStatus;
  created_at: string;
  updated_at: string;
}

export type BookType = "sell" | "not_for_sell";

export interface Book {
  id: string;
  title: string;
  subtitle: string | null;
  genre: string | null;
  isbn: string | null;
  cover_url: string | null;
  author_id: string;
  launch_date: string | null;
  expected_publish_date: string | null;
  isbn_date: string | null;
  royalty_percent: number;
  pricing: number | null;
  current_stage: PublishingStage;
  progress_percent: number;
  book_type: BookType;
  serial_number: string | null;
  created_at: string;
  updated_at: string;
  author?: Profile;
  sales?: Sales;
}

export interface Sales {
  id: string;
  book_id: string;
  copies_sold: number;
  website_sales: number;
  amazon_sales: number;
  monthly_revenue: number;
  total_revenue: number;
  ranking: number | null;
  royalty_earned: number | null;
  last_royalty_credit_at: string | null;
  updated_at: string;
}

export interface AuthorRoyalties {
  author_id: string;
  available_balance: number;
  pending_balance: number;
  lifetime_earnings: number;
  total_withdrawn: number | null;
  last_payout_at: string | null;
  next_payout_at: string | null;
}

export interface ManuscriptVersion {
  id: string;
  manuscript_id: string;
  version_number: number;
  label: string;
  file_url: string;
  file_name: string;
  file_type: string;
  file_size: number;
  uploaded_by: string;
  notes: string | null;
  status: string;
  admin_comment: string | null;
  created_at: string;
  uploader?: Profile;
}

export interface CoverDesign {
  id: string;
  book_id: string;
  version_number: number;
  image_url: string;
  status: string;
  uploaded_by: string;
  author_feedback: string | null;
  admin_notes: string | null;
  is_final: boolean;
  created_at: string;
}

export interface ActivityLog {
  id: string;
  book_id: string | null;
  user_id: string | null;
  action: string;
  entity_type: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  user?: Profile;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  attachments: unknown[];
  created_at: string;
  sender?: Profile;
}

export interface WithdrawalRequest {
  id: string;
  author_id: string;
  amount: number;
  bank_snapshot: Record<string, string>;
  status: "pending" | "approved" | "rejected" | "paid";
  utr: string | null;
  admin_notes: string | null;
  processed_by: string | null;
  processed_at: string | null;
  created_at: string;
  author?: Profile;
}

export interface RoyaltyTransaction {
  id: string;
  author_id: string;
  book_id: string | null;
  amount: number;
  tx_type: "credit" | "payout" | "adjustment";
  description: string | null;
  created_by: string | null;
  created_at: string;
  book?: Pick<Book, "id" | "title">;
}

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string;
  link: string | null;
  read: boolean;
  metadata: Record<string, any> | null;
  created_at: string;
}

