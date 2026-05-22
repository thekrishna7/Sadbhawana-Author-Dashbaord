"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/ui/toast";
import { useRealtimeTable } from "@/hooks/use-realtime";
import { getErrorMessage } from "@/lib/errors";
import { Send, X, Loader2, MessageSquare } from "lucide-react";
import type { Message, Profile } from "@/lib/types/database";

interface CommentsDrawerProps {
  threadId: string;
  type: "author_editor" | "author_designer" | "author_admin";
  bookId: string;
  currentUserId: string;
  title: string;
  isOpen: boolean;
  onClose: () => void;
}

export function CommentsDrawer({
  threadId,
  type,
  bookId,
  currentUserId,
  title,
  isOpen,
  onClose,
}: CommentsDrawerProps) {
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<(Message & { sender?: Profile })[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const { error: showToastError } = useToast();
  const bottomRef = useRef<HTMLDivElement>(null);

  const ensureConversation = useCallback(async (): Promise<string | null> => {
    const supabase = createClient();
    const uniqueTitle = `${type}_thread_${threadId}`;

    const { data: existing } = await supabase
      .from("conversations")
      .select("id")
      .eq("book_id", bookId)
      .eq("title", uniqueTitle)
      .maybeSingle();

    if (existing?.id) {
      // Ensure current user is in participants
      const { data: mine } = await supabase
        .from("conversation_participants")
        .select("user_id")
        .eq("conversation_id", existing.id)
        .eq("user_id", currentUserId)
        .maybeSingle();

      if (!mine) {
        await supabase.from("conversation_participants").insert({
          conversation_id: existing.id,
          user_id: currentUserId,
        });
      }
      setConversationId(existing.id);
      return existing.id;
    }

    const { data: book } = await supabase
      .from("books")
      .select("author_id")
      .eq("id", bookId)
      .single();

    if (!book) return null;

    const { data: conv, error: convErr } = await supabase
      .from("conversations")
      .insert({
        book_id: bookId,
        conversation_type: type,
        title: uniqueTitle,
      })
      .select("id")
      .single();

    if (convErr || !conv) {
      console.error(convErr);
      return null;
    }

    const participants = [
      { conversation_id: conv.id, user_id: currentUserId },
    ];
    if (book.author_id !== currentUserId) {
      participants.push({ conversation_id: conv.id, user_id: book.author_id });
    }

    // Add super admins/staff as well if they exist
    const { data: adminList } = await supabase
      .from("profiles")
      .select("id")
      .eq("role", "super_admin");
    if (adminList) {
      adminList.forEach((admin) => {
        if (admin.id !== currentUserId && admin.id !== book.author_id) {
          participants.push({ conversation_id: conv.id, user_id: admin.id });
        }
      });
    }

    await supabase.from("conversation_participants").insert(participants);
    setConversationId(conv.id);
    return conv.id;
  }, [bookId, currentUserId, type, threadId]);

  const loadMessages = useCallback(async (convId: string) => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("messages")
      .select("*, sender:profiles!messages_sender_id_fkey(id, full_name, avatar_url, role)")
      .eq("conversation_id", convId)
      .order("created_at", { ascending: true });

    if (error) {
      showToastError(error.message);
    } else {
      setMessages((data as (Message & { sender?: Profile })[]) ?? []);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    }
    setLoading(false);
  }, [showToastError]);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      ensureConversation().then((id) => {
        if (id) {
          loadMessages(id);
        } else {
          setLoading(false);
        }
      });
    }
  }, [isOpen, ensureConversation, loadMessages]);

  useRealtimeTable(
    "messages",
    conversationId ? { column: "conversation_id", value: conversationId } : null,
    () => {
      if (conversationId) loadMessages(conversationId);
    }
  );

  async function send() {
    if (!text.trim()) return;
    setSending(true);
    try {
      const convId = conversationId ?? (await ensureConversation());
      if (!convId) return;

      const supabase = createClient();
      const { error } = await supabase.from("messages").insert({
        conversation_id: convId,
        sender_id: currentUserId,
        content: text.trim(),
      });
      if (error) throw error;
      setText("");
      await loadMessages(convId);
    } catch (err) {
      showToastError(getErrorMessage(err));
    } finally {
      setSending(false);
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
          />

          {/* Drawer Panel */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed bottom-0 right-0 top-0 z-50 flex w-full max-w-md flex-col border-l border-white/10 bg-zinc-950 shadow-2xl backdrop-blur-3xl md:max-w-lg"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/6 px-6 py-5">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-violet-400" />
                <div>
                  <h3 className="font-semibold text-white">Comments</h3>
                  <p className="text-xs text-zinc-500">{title}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg p-2 hover:bg-white/5 text-zinc-400 hover:text-white transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Comments List */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {loading ? (
                <div className="flex h-full items-center justify-center text-zinc-500 gap-2">
                  <Loader2 className="h-5 w-5 animate-spin text-violet-400" />
                  Loading thread…
                </div>
              ) : messages.length === 0 ? (
                <div className="flex h-[80%] items-center justify-center p-6">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.4 }}
                    className="relative overflow-hidden rounded-2xl border border-white/5 bg-zinc-950/20 p-6 max-w-sm w-full text-center shadow-lg backdrop-blur-md"
                  >
                    {/* Glowing background */}
                    <div className="absolute -top-12 -left-12 h-24 w-24 rounded-full bg-violet-600/5 blur-[40px]" />
                    
                    <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-900 border border-white/5 shadow-inner">
                      <MessageSquare className="h-5 w-5 text-violet-400" />
                    </div>
                    <h4 className="text-sm font-bold text-zinc-200">No comments yet</h4>
                    <p className="text-xs text-zinc-400 mt-1 max-w-[240px] mx-auto leading-relaxed">
                      Be the first to share your thoughts, design feedback, or revision requests.
                    </p>
                  </motion.div>
                </div>
              ) : (
                messages.map((m) => {
                  const isMe = m.sender_id === currentUserId;
                  const roleColors: Record<string, string> = {
                    super_admin: "text-amber-400 bg-amber-500/10",
                    staff: "text-blue-400 bg-blue-500/10",
                    author: "text-violet-400 bg-violet-500/10",
                  };
                  const senderRole = m.sender?.role ?? "author";

                  return (
                    <div
                      key={m.id}
                      className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}
                    >
                      <div
                        className={`max-w-[85%] rounded-2xl p-4 ${
                          isMe
                            ? "bg-violet-600/20 border border-violet-500/20 text-white"
                            : "bg-white/5 border border-white/5 text-zinc-200"
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-semibold text-zinc-300">
                            {m.sender?.full_name ?? "User"}
                          </span>
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] capitalize font-medium ${
                              roleColors[senderRole] || "text-zinc-400 bg-zinc-500/10"
                            }`}
                          >
                            {senderRole.replace("_", " ")}
                          </span>
                        </div>
                        <p className="text-sm whitespace-pre-wrap leading-relaxed">{m.content}</p>
                        <p className="text-[10px] text-zinc-500 mt-2 text-right">
                          {new Date(m.created_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={bottomRef} />
            </div>

            {/* Input Bar */}
            <div className="border-t border-white/6 p-6">
              <div className="flex gap-3">
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      send();
                    }
                  }}
                  placeholder="Add a comment…"
                  className="flex-1 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-zinc-500 resize-none min-h-[46px] max-h-[120px] focus:outline-none focus:border-violet-500/50"
                  rows={1}
                />
                <button
                  type="button"
                  onClick={send}
                  disabled={sending || !text.trim()}
                  className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-600 text-white hover:bg-violet-500 disabled:opacity-50 transition shrink-0 self-end"
                >
                  {sending ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Send className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
