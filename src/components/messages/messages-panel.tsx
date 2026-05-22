"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { GlassCard } from "@/components/ui/glass-card";
import { ErrorBanner } from "@/components/ui/error-banner";
import { useToast } from "@/components/ui/toast";
import { getErrorMessage } from "@/lib/errors";
import { uploadPrivate, resolveFileUrl, storageRef, parseStorageRef } from "@/lib/storage";
import { sendNotification } from "@/lib/notifications";
import type { Message, Profile } from "@/lib/types/database";
import {
  Send,
  Loader2,
  Paperclip,
  Hash,
  Info,
  User,
  X,
  FileText,
  Download,
  AlertCircle,
} from "lucide-react";

interface Attachment {
  name: string;
  url: string;
  type: string;
  size: number;
}

const CHANNELS = [
  { key: "book_thread", name: "general-chat", label: "General Chat", desc: "Main project thread for all team discussions" },
  { key: "author_editor", name: "editorial-team", label: "Editorial & Manuscripts", desc: "Manuscript review, edits, and drafting progress" },
  { key: "author_designer", name: "design-desk", label: "Design & Covers", desc: "Book layout, illustration briefs, and cover draft review" },
  { key: "author_admin", name: "hq-admin", label: "HQ & Production", desc: "Agreements, billing, production scheduling, and approvals" },
] as const;

type ChannelKey = (typeof CHANNELS)[number]["key"];

export function MessagesPanel({
  bookId,
  authorId,
  currentUserId,
}: {
  bookId?: string;
  authorId?: string;
  currentUserId: string;
  title: string;
}) {
  const [activeChannel, setActiveChannel] = useState<ChannelKey>("book_thread");
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<(Message & { sender?: Profile })[]>([]);
  const [text, setText] = useState("");
  
  // Realtime typing indicator states
  const [typingUsers, setTypingUsers] = useState<Record<string, { name: string; expiry: number }>>({});
  
  // File uploads
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [resolvedUrls, setResolvedUrls] = useState<Record<string, string>>({});
  
  // Dynamic Workspace states
  const [booksList, setBooksList] = useState<{ id: string; title: string; author?: Profile }[]>([]);
  const [selectedBookId, setSelectedBookId] = useState<string | null>(bookId ?? null);
  
  // Presence and Read tracking states
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const [unreadCounts, setUnreadCounts] = useState<Record<ChannelKey, number>>({
    book_thread: 0,
    author_editor: 0,
    author_designer: 0,
    author_admin: 0,
  });
  const [currentUserProfile, setCurrentUserProfile] = useState<Profile | null>(null);

  const activeBookId = bookId || selectedBookId;
  
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const toast = useToast();
  const typingTimerRef = useRef<Record<string, NodeJS.Timeout>>({});

  // Fetch role, profiles, and available books
  useEffect(() => {
    const supabase = createClient();

    supabase
      .from("profiles")
      .select("*")
      .eq("id", currentUserId)
      .single()
      .then(({ data }) => {
        if (data) {
          setCurrentUserProfile(data as Profile);
        }
      });

    if (bookId) {
      setSelectedBookId(bookId);
      return;
    }

    supabase.auth.getUser().then(({ data: authData }) => {
      if (!authData.user) return;
      
      supabase
        .from("profiles")
        .select("role")
        .eq("id", currentUserId)
        .single()
        .then(({ data: profile }) => {
          if (!profile) return;
          const role = profile.role;
          
          if (role === "author") {
            supabase
              .from("books")
              .select("id, title")
              .eq("author_id", currentUserId)
              .then(({ data: booksData }) => {
                if (booksData) {
                  setBooksList(booksData);
                  if (booksData.length > 0) {
                    setSelectedBookId(booksData[0].id);
                  }
                }
              });
          } else {
            let query = supabase
              .from("books")
              .select("id, title, author:profiles(id, full_name)");
            
            if (authorId) {
              query = query.eq("author_id", authorId);
            }
            
            query.then(({ data: booksData }) => {
              if (booksData) {
                setBooksList(booksData as unknown as { id: string; title: string; author?: Profile }[]);
                if (booksData.length > 0) {
                  setSelectedBookId(booksData[0].id);
                }
              }
            });
          }
        });
    });
  }, [bookId, authorId, currentUserId]);

  const ensureConversation = useCallback(async (channelKey: ChannelKey): Promise<string | null> => {
    const supabase = createClient();
    setError(null);

    if (!activeBookId) {
      setError("Please select a book/project to start a discussion.");
      return null;
    }

    const { data: existing } = await supabase
      .from("conversations")
      .select("id")
      .eq("book_id", activeBookId)
      .eq("conversation_type", channelKey)
      .maybeSingle();

    if (existing?.id) {
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
      return existing.id;
    }

    const { data: book, error: bookErr } = await supabase
      .from("books")
      .select("author_id, title")
      .eq("id", activeBookId)
      .single();

    if (bookErr || !book) {
      setError(bookErr?.message ?? "Book not found");
      return null;
    }

    const { data: conv, error: convErr } = await supabase
      .from("conversations")
      .insert({
        book_id: activeBookId,
        conversation_type: channelKey,
        title: `${book.title} — ${CHANNELS.find((c) => c.key === channelKey)?.label}`,
      })
      .select("id")
      .single();

    if (convErr || !conv) {
      setError(convErr?.message ?? "Could not create channel conversation");
      return null;
    }

    const participants = [
      { conversation_id: conv.id, user_id: currentUserId },
    ];
    if (book.author_id !== currentUserId) {
      participants.push({ conversation_id: conv.id, user_id: book.author_id });
    }

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
    return conv.id;
  }, [activeBookId, currentUserId]);

  const loadMessages = useCallback(async (convId: string) => {
    const supabase = createClient();
    const { data, error: err } = await supabase
      .from("messages")
      .select("*, sender:profiles!messages_sender_id_fkey(id, full_name, avatar_url, role)")
      .eq("conversation_id", convId)
      .order("created_at", { ascending: true });

    if (err) {
      setError(err.message);
    } else {
      const messagesList = (data as (Message & { sender?: Profile })[]) ?? [];
      setMessages(messagesList);
      
      const urls: Record<string, string> = {};
      for (const msg of messagesList) {
        if (msg.attachments && Array.isArray(msg.attachments)) {
          for (const att of msg.attachments as Attachment[]) {
            try {
              const ref = parseStorageRef(att.url);
              urls[att.url] = ref 
                ? await resolveFileUrl(ref.path, ref.bucket)
                : await resolveFileUrl(att.url, "message-attachments");
            } catch {
              urls[att.url] = att.url;
            }
          }
        }
      }
      setResolvedUrls((prev) => ({ ...prev, ...urls }));
      
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    }
    setLoading(false);
  }, []);

  // Initialize and load conversation
  useEffect(() => {
    setLoading(true);
    setMessages([]);
    setConversationId(null);
    
    if (!activeBookId) {
      setLoading(false);
      return;
    }

    ensureConversation(activeChannel).then((id) => {
      if (id) {
        setConversationId(id);
        loadMessages(id);
      } else {
        setLoading(false);
      }
    });
  }, [activeChannel, activeBookId, ensureConversation, loadMessages]);

  // Realtime subscription for instant message inserts
  useEffect(() => {
    if (!conversationId) return;

    const supabase = createClient();
    const channel = supabase
      .channel(`realtime-messages-${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        async (payload) => {
          const newId = payload.new.id;
          
          const { data: newMsg, error } = await supabase
            .from("messages")
            .select("*, sender:profiles!messages_sender_id_fkey(id, full_name, avatar_url, role)")
            .eq("id", newId)
            .single();

          if (!error && newMsg) {
            setMessages((prev) => {
              if (prev.some((m) => m.id === newMsg.id)) return prev;
              return [...prev, newMsg];
            });

            if (newMsg.attachments && Array.isArray(newMsg.attachments)) {
              const urls: Record<string, string> = {};
              for (const att of newMsg.attachments as Attachment[]) {
                try {
                  const ref = parseStorageRef(att.url);
                  urls[att.url] = ref 
                    ? await resolveFileUrl(ref.path, ref.bucket)
                    : await resolveFileUrl(att.url, "message-attachments");
                } catch {
                  urls[att.url] = att.url;
                }
              }
              setResolvedUrls((prev) => ({ ...prev, ...urls }));
            }

            setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId]);

  // Realtime Presence tracking for online status
  useEffect(() => {
    if (!conversationId) return;

    const supabase = createClient();
    const channel = supabase.channel(`presence-${conversationId}`, {
      config: {
        presence: {
          key: currentUserId,
        },
      },
    });

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        const onlineIds = Object.keys(state);
        setOnlineUsers(onlineIds);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({
            online_at: new Date().toISOString(),
          });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, currentUserId]);

  const markAsRead = useCallback(async (convId: string) => {
    const supabase = createClient();
    await supabase
      .from("conversation_participants")
      .update({ last_read_at: new Date().toISOString() })
      .eq("conversation_id", convId)
      .eq("user_id", currentUserId);
  }, [currentUserId]);

  // Load and subscribe to unread counts
  const loadUnreadCounts = useCallback(async () => {
    if (!activeBookId) return;
    const supabase = createClient();

    const { data: convs } = await supabase
      .from("conversations")
      .select("id, conversation_type")
      .eq("book_id", activeBookId);
      
    if (!convs) return;
    
    const counts: Record<string, number> = {};
    
    await Promise.all(
      convs.map(async (c) => {
        const type = c.conversation_type as ChannelKey;
        const { data: part } = await supabase
          .from("conversation_participants")
          .select("last_read_at")
          .eq("conversation_id", c.id)
          .eq("user_id", currentUserId)
          .maybeSingle();
          
        if (!part) {
          counts[type] = 0;
          return;
        }
        
        const { count } = await supabase
          .from("messages")
          .select("id", { count: "exact", head: true })
          .eq("conversation_id", c.id)
          .gt("created_at", part.last_read_at);
          
        counts[type] = count ?? 0;
      })
    );
    
    setUnreadCounts(counts as Record<ChannelKey, number>);
  }, [activeBookId, currentUserId]);

  useEffect(() => {
    loadUnreadCounts();
  }, [activeBookId, loadUnreadCounts, messages]);

  useEffect(() => {
    if (conversationId) {
      markAsRead(conversationId).then(() => {
        setUnreadCounts((prev) => ({ ...prev, [activeChannel]: 0 }));
      });
    }
  }, [conversationId, activeChannel, markAsRead]);


  // Realtime Broadcast Channel for typing indicators
  useEffect(() => {
    if (!conversationId) return;

    const supabase = createClient();
    const channel = supabase.channel(`typing-room-${conversationId}`);

    channel
      .on("broadcast", { event: "typing" }, ({ payload }) => {
        const { userId, userName, isTyping } = payload;
        if (userId === currentUserId) return;

        setTypingUsers((prev) => {
          const updated = { ...prev };
          if (isTyping) {
            updated[userId] = { name: userName, expiry: Date.now() + 3000 };
            
            // Clear existing timer if any
            if (typingTimerRef.current[userId]) {
              clearTimeout(typingTimerRef.current[userId]);
            }
            
            // Set clear timer after 3 seconds
            typingTimerRef.current[userId] = setTimeout(() => {
              setTypingUsers((current) => {
                const copy = { ...current };
                delete copy[userId];
                return copy;
              });
            }, 3000);
          } else {
            delete updated[userId];
          }
          return updated;
        });
      })
      .subscribe();

    const currentTimers = typingTimerRef.current;
    return () => {
      supabase.removeChannel(channel);
      // Clean up timers
      Object.values(currentTimers).forEach(clearTimeout);
    };
  }, [conversationId, currentUserId]);

  // Broadcast typing state
  function sendTypingState(isTyping: boolean) {
    if (!conversationId) return;
    const supabase = createClient();
    supabase.channel(`typing-room-${conversationId}`).send({
      type: "broadcast",
      event: "typing",
      payload: {
        userId: currentUserId,
        userName: currentUserProfile?.full_name || "Someone",
        isTyping,
      },
    });
  }

  let typingTimeout: NodeJS.Timeout | null = null;
  function handleTextInput(val: string) {
    setText(val);
    sendTypingState(true);

    if (typingTimeout) clearTimeout(typingTimeout);
    typingTimeout = setTimeout(() => {
      sendTypingState(false);
    }, 2000);
  }

  // File selection
  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  }

  // Send message
  async function send() {
    if (!text.trim() && !selectedFile) return;
    setSending(true);
    setError(null);
    try {
      const convId = conversationId ?? (await ensureConversation(activeChannel));
      if (!convId) return;

      const supabase = createClient();
      const attachmentPayload: Attachment[] = [];

      if (selectedFile) {
        setUploadingFile(true);
        if (!activeBookId) throw new Error("No active book selected for file upload path");
        const path = `${activeBookId}/${Date.now()}-${selectedFile.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
        const { path: storedPath } = await uploadPrivate("message-attachments", path, selectedFile);
        const fileRef = storageRef("message-attachments", storedPath);
        
        attachmentPayload.push({
          name: selectedFile.name,
          url: fileRef,
          type: selectedFile.type,
          size: selectedFile.size,
        });
      }

      const { error: err } = await supabase.from("messages").insert({
        conversation_id: convId,
        sender_id: currentUserId,
        content: text.trim(),
        attachments: attachmentPayload.length > 0 ? attachmentPayload : null,
      });
      if (err) throw err;

      // Reset state
      setText("");
      setSelectedFile(null);
      setUploadingFile(false);
      sendTypingState(false);
      
      // Notify recipient
      if (activeBookId) {
        const { data: book } = await supabase.from("books").select("author_id, title").eq("id", activeBookId).single();
        if (book) {
          const isAuthor = currentUserId === book.author_id;
          const senderProfile = await supabase.from("profiles").select("full_name").eq("id", currentUserId).single();
          const senderName = senderProfile.data?.full_name ?? "Team member";
          
          const channelName = CHANNELS.find((c) => c.key === activeChannel)?.name || "general";
          if (isAuthor) {
            // Notify Admin
            const { data: admins } = await supabase.from("profiles").select("id").eq("role", "super_admin");
            if (admins && admins.length > 0) {
              await sendNotification({
                userIds: admins.map((admin) => admin.id),
                type: "message",
                title: `New message on #${channelName}`,
                body: `${senderName} [${book.title}]: "${text.substring(0, 40)}${text.length > 40 ? "..." : ""}"`,
                link: `/admin/books/${activeBookId}`,
              });
            }
          } else {
            // Notify Author
            await sendNotification({
              userIds: [book.author_id],
              type: "message",
              title: `New message on #${channelName}`,
              body: `${senderName}: "${text.substring(0, 40)}${text.length > 40 ? "..." : ""}"`,
              link: `/author/books/${activeBookId}`,
            });
          }
        }
      }

      await loadMessages(convId);
    } catch (err) {
      setError(getErrorMessage(err));
      toast.error("Failed to send message.");
    } finally {
      setSending(false);
      setUploadingFile(false);
    }
  }

  // Active channel descriptor
  const activeChanDesc = CHANNELS.find((c) => c.key === activeChannel);

  return (
    <div className="grid gap-6 lg:grid-cols-[260px_1fr] h-auto lg:h-[680px]">
      {/* Sidebar Channel Switcher - Desktop */}
      <GlassCard className="hidden lg:flex flex-col p-4! border-white/5 overflow-y-auto bg-zinc-950/40 h-full" hover={false}>
        {!bookId && booksList.length > 0 && (
          <div className="mb-4 px-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block mb-2">
              Book Workspace
            </label>
            <div className="relative">
              <select
                value={selectedBookId ?? ""}
                onChange={(e) => setSelectedBookId(e.target.value)}
                className="w-full bg-zinc-900/60 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-violet-500/50 appearance-none cursor-pointer pr-8"
              >
                {booksList.map((b) => (
                  <option key={b.id} value={b.id} className="bg-zinc-950 text-white text-xs">
                    {b.title} {b.author?.full_name ? `(${b.author.full_name})` : ""}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-zinc-400">
                <svg className="fill-current h-3.5 w-3.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                  <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                </svg>
              </div>
            </div>
            <div className="my-4 border-b border-white/5" />
          </div>
        )}

        <div className="mb-4 px-2">
          <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Channels</h4>
        </div>
        <div className="space-y-1.5 flex-1">
          {CHANNELS.map((chan) => (
            <button
              key={chan.key}
              onClick={() => setActiveChannel(chan.key)}
              className={`w-full flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-sm font-medium transition text-left ${
                activeChannel === chan.key
                  ? "bg-violet-600/20 text-violet-200 border border-violet-500/20"
                  : "text-zinc-400 border border-transparent hover:bg-white/5 hover:text-white"
              }`}
            >
              <Hash className={`h-4 w-4 shrink-0 ${activeChannel === chan.key ? "text-violet-400" : "text-zinc-500"}`} />
              <span className="truncate flex-1">{chan.name}</span>
              {unreadCounts[chan.key] > 0 && (
                <span className="bg-violet-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full min-w-[18px] text-center animate-pulse">
                  {unreadCounts[chan.key]}
                </span>
              )}
            </button>
          ))}
        </div>
        <div className="pt-4 border-t border-white/5 text-[11px] text-zinc-500 px-2 leading-relaxed">
          <Info className="h-3 w-3 inline mr-1 text-zinc-400" />
          Click a channel to communicate with different departments.
        </div>
      </GlassCard>

      {/* Channel Switcher - Mobile/Tablet */}
      <div className="lg:hidden flex flex-col gap-3 bg-zinc-950/40 p-4 rounded-2xl border border-white/5">
        {!bookId && booksList.length > 0 && (
          <div className="w-full">
            <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest block mb-1">
              Book Workspace
            </label>
            <div className="relative">
              <select
                value={selectedBookId ?? ""}
                onChange={(e) => setSelectedBookId(e.target.value)}
                className="w-full bg-zinc-900/60 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-violet-500/50 appearance-none cursor-pointer pr-8"
              >
                {booksList.map((b) => (
                  <option key={b.id} value={b.id} className="bg-zinc-950 text-white text-xs">
                    {b.title} {b.author?.full_name ? `(${b.author.full_name})` : ""}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-zinc-400">
                <svg className="fill-current h-3.5 w-3.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                  <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                </svg>
              </div>
            </div>
          </div>
        )}

        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {CHANNELS.map((chan) => (
            <button
              key={chan.key}
              onClick={() => setActiveChannel(chan.key)}
              className={`flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-semibold tracking-wide transition shrink-0 whitespace-nowrap ${
                activeChannel === chan.key
                  ? "bg-violet-600/20 text-violet-200 border border-violet-500/30"
                  : "text-zinc-400 bg-white/5 border border-white/5 hover:bg-white/10 hover:text-white"
              }`}
            >
              <Hash className="h-3 w-3" />
              <span>{chan.name}</span>
              {unreadCounts[chan.key] > 0 && (
                <span className="bg-violet-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full animate-pulse">
                  {unreadCounts[chan.key]}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Slack Chat Window */}
      <GlassCard className="flex flex-col overflow-hidden p-0! border-white/5 bg-zinc-950/20 h-[500px] lg:h-full" hover={false}>
        {/* Chat Header */}
        <div className="border-b border-white/5 px-6 py-4 flex items-center justify-between bg-zinc-950/40">
          <div>
            <h3 className="font-bold text-white text-base flex items-center gap-1">
              #{activeChanDesc?.name}
            </h3>
            <p className="text-xs text-zinc-500 mt-0.5">{activeChanDesc?.desc}</p>
          </div>
          {!activeBookId && (
            <span className="text-xs text-amber-400 bg-amber-500/10 rounded-full px-3 py-1 flex items-center gap-1.5 border border-amber-500/20">
              <AlertCircle className="h-3.5 w-3.5" /> Book not selected
            </span>
          )}
        </div>

        <div className="px-6 pt-4 shrink-0">
          <ErrorBanner message={error ?? ""} onDismiss={() => setError(null)} />
        </div>

        {/* Message timeline */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {loading ? (
            <div className="flex h-full items-center justify-center text-zinc-500 gap-2">
              <Loader2 className="h-5 w-5 animate-spin text-violet-400" /> Connecting to channel…
            </div>
          ) : messages.length === 0 ? (
            <div className="flex h-full items-center justify-center p-4 md:p-8">
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="relative overflow-hidden rounded-3xl border border-white/5 bg-zinc-950/40 p-8 max-w-md w-full text-center backdrop-blur-xl shadow-[0_0_50px_-12px_rgba(124,58,237,0.15)]"
              >
                {/* Decorative background glow */}
                <div className="absolute -top-24 -left-24 h-48 w-48 rounded-full bg-violet-600/10 blur-[60px]" />
                <div className="absolute -bottom-24 -right-24 h-48 w-48 rounded-full bg-indigo-600/10 blur-[60px]" />

                {/* Glowing Icon Wrapper */}
                <div className="relative mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-900 border border-white/10 shadow-lg">
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-violet-600/20 to-indigo-600/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                  <Hash className="h-8 w-8 text-violet-400" />
                </div>

                {/* Welcome Heading */}
                <h3 className="text-xl font-bold bg-gradient-to-b from-white to-zinc-400 bg-clip-text text-transparent tracking-tight">
                  Welcome to #{activeChanDesc?.name}!
                </h3>
                <p className="text-xs text-zinc-400 mt-2 max-w-sm mx-auto leading-relaxed">
                  {activeChanDesc?.desc || "This is the start of the channel conversation thread."}
                </p>

                {/* Separator */}
                <div className="my-6 h-px w-full bg-gradient-to-r from-transparent via-white/5 to-transparent" />

                {/* Quick actions/hints */}
                <div className="space-y-3.5 text-left">
                  <div className="flex items-start gap-3 rounded-2xl bg-white/[0.02] border border-white/5 p-3.5 hover:bg-white/[0.04] transition duration-200">
                    <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-lg bg-violet-500/10 text-violet-400 border border-violet-500/10">
                      <Send className="h-3 w-3" />
                    </div>
                    <div>
                      <h4 className="text-xs font-semibold text-zinc-200">Start Discussion</h4>
                      <p className="text-[10px] text-zinc-500 mt-0.5 leading-relaxed">Type a message below and hit Enter to share updates with the project group.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 rounded-2xl bg-white/[0.02] border border-white/5 p-3.5 hover:bg-white/[0.04] transition duration-200">
                    <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/10">
                      <Paperclip className="h-3 w-3" />
                    </div>
                    <div>
                      <h4 className="text-xs font-semibold text-zinc-200">Send Attachments</h4>
                      <p className="text-[10px] text-zinc-500 mt-0.5 leading-relaxed">Use the paperclip to upload PDF invoices, manuscript files, or cover drafts directly.</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          ) : (
            messages.map((m) => {
              const isMe = m.sender_id === currentUserId;
              const senderRole = m.sender?.role ?? "author";
              
              const roleClasses: Record<string, string> = {
                super_admin: "text-amber-400 bg-amber-500/10",
                staff: "text-blue-400 bg-blue-500/10",
                author: "text-violet-400 bg-violet-500/10",
              };

              return (
                <div key={m.id} className={`flex gap-3 items-start ${isMe ? "flex-row-reverse" : ""}`}>
                  {/* User Avatar Placeholder */}
                  <div className="relative shrink-0">
                    <div className="h-8 w-8 rounded-full bg-zinc-800 border border-white/5 flex items-center justify-center text-xs font-bold text-zinc-400">
                      {m.sender?.full_name ? m.sender.full_name.substring(0, 2).toUpperCase() : <User className="h-4 w-4" />}
                    </div>
                    {onlineUsers.includes(m.sender_id) && (
                      <span className="absolute bottom-0 right-0 block h-2.5 w-2.5 rounded-full bg-green-400 ring-2 ring-zinc-950 animate-pulse" />
                    )}
                  </div>

                  <div className={`max-w-[70%] space-y-1 ${isMe ? "items-end flex flex-col" : "items-start"}`}>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-zinc-200">
                        {m.sender?.full_name ?? "User"}
                      </span>
                      <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full ${roleClasses[senderRole] || "text-zinc-500"}`}>
                        {senderRole.replace("_", " ")}
                      </span>
                      <span className="text-[10px] text-zinc-500">
                        {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <div className={`rounded-2xl px-4 py-3 text-sm leading-relaxed border ${
                      isMe
                        ? "bg-violet-600/20 border-violet-500/25 text-white"
                        : "bg-white/5 border-white/5 text-zinc-200"
                    }`}>
                      {m.content && <p className="whitespace-pre-wrap">{m.content}</p>}
                      
                      {/* Attachments rendering */}
                      {m.attachments && Array.isArray(m.attachments) && (
                        <div className="mt-2 space-y-1.5 border-t border-white/5 pt-2">
                          {(m.attachments as Attachment[]).map((att, idx) => (
                            <div key={idx} className="flex items-center justify-between gap-4 bg-zinc-950/40 rounded-xl px-3 py-2 border border-white/5">
                              <div className="flex items-center gap-2 overflow-hidden">
                                <FileText className="h-4 w-4 text-violet-400 shrink-0" />
                                <span className="text-xs text-zinc-300 truncate max-w-[160px]">{att.name}</span>
                                <span className="text-[9px] text-zinc-500 shrink-0">({(att.size / (1024 * 1024)).toFixed(2)} MB)</span>
                              </div>
                              {resolvedUrls[att.url] && (
                                <a
                                  href={resolvedUrls[att.url]}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-violet-400 hover:text-violet-300 transition text-xs shrink-0 flex items-center gap-1"
                                >
                                  <Download className="h-3 w-3" /> Get
                                </a>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={bottomRef} />
        </div>

        {/* Typing and upload bar status */}
        <div className="px-6 py-1 shrink-0">
          {Object.keys(typingUsers).length > 0 && (
            <p className="text-[10px] text-zinc-500 italic animate-pulse">
              {Object.values(typingUsers).map((u) => u.name).join(", ")} typing...
            </p>
          )}
        </div>

        {/* Input Bar */}
        <div className="border-t border-white/5 p-4 flex flex-col gap-2 bg-zinc-950/40">
          {selectedFile && (
            <div className="flex items-center justify-between bg-violet-600/10 border border-violet-500/20 rounded-xl px-4 py-2 text-xs">
              <div className="flex items-center gap-2 overflow-hidden truncate">
                <Paperclip className="h-3.5 w-3.5 text-violet-400 shrink-0" />
                <span className="font-medium text-white truncate">{selectedFile.name}</span>
                <span className="text-zinc-500 text-[10px] shrink-0">({(selectedFile.size / 1024).toFixed(1)} KB)</span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedFile(null)}
                className="text-zinc-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={!activeBookId || uploadingFile || sending}
              className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white disabled:opacity-50 transition shrink-0"
            >
              <Paperclip className="h-5 w-5" />
            </button>
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              onChange={handleFileSelect}
              disabled={!activeBookId || uploadingFile || sending}
            />

            <input
              value={text}
              onChange={(e) => handleTextInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), send())}
              placeholder={activeBookId ? `Message #${activeChanDesc?.name}…` : "Open a book to message"}
              disabled={!activeBookId || sending || uploadingFile}
              className="flex-1 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-violet-500/50 disabled:opacity-50 text-sm"
            />
            
            <button
              type="button"
              onClick={send}
              disabled={!activeBookId || sending || uploadingFile || (!text.trim() && !selectedFile)}
              className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-600 text-white hover:bg-violet-500 disabled:opacity-50 transition shrink-0"
            >
              {sending || uploadingFile ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Send className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>
      </GlassCard>
    </div>
  );
}
