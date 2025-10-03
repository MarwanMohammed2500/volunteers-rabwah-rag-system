import React, { useEffect, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Header } from "./header";
import { MessageBubble } from "./message-bubble";
import { ChatInput } from "./chat-input";
import { apiRequest } from "@/lib/queryClient";
import { ChatMessage } from "@shared/schema";
import { Bot } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { v4 as uuidv4 } from "uuid";
import { Sidebar } from "./sidebar"
type Props = {
  userId?: string | null;
};

export function ChatInterface({ userId }: Props) {
  const [activeNamespace, setActiveNamespace] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // SSR-safe localStorage-backed session id.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (sessionId) return;

    const storageKey = userId ? `chat_session_id:${userId}` : "chat_session_id";

    try {
      let id = localStorage.getItem(storageKey);
      if (!id) {
        id = uuidv4();
        localStorage.setItem(storageKey, id);
      }
      setSessionId(id);
    } catch (err) {
      // localStorage not available (private mode, SSR edge case). Fall back to ephemeral id.
      console.warn("localStorage unavailable, using ephemeral session id", err);
      setSessionId(uuidv4());
    }
  }, [sessionId, userId]);

  const { data: messages = [], isLoading, error } = useQuery<ChatMessage[]>({
  queryKey: ["/api/chat", activeNamespace, sessionId, "messages"],
  queryFn: async () => {
    if (!sessionId || !activeNamespace) return [];
    const res = await apiRequest("GET", `/api/chat/${activeNamespace}/${sessionId}/messages`);
    if (!res.ok) throw new Error("Failed to fetch messages");
    return res.json();
  },
  enabled: !!sessionId && !!activeNamespace,
});


  useEffect(() => {
    console.log("🔄 Session ID:", sessionId);
    console.log("📨 Current messages count:", messages.length);
    console.log("📨 Messages:", messages);
  }, [sessionId, messages]);

  const sendMessageMutation = useMutation({
  mutationFn: async (content: string) => {
    if (!sessionId || !activeNamespace) throw new Error("sessionId or namespace not set");
    const response = await apiRequest("POST", `/api/chat/${activeNamespace}/${sessionId}/message`, { content });
    return response.json();
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ["/api/chat", activeNamespace, sessionId, "messages"] });
  },
});

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (!messages) return;
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    queryClient.getQueryData<{ namespaces?: string[] }>(["/api/chat/namespaces"]);
    const namespaces = queryClient.getQueryData<{ namespaces?: string[] }>(["/api/chat/namespaces"]);
    if (!activeNamespace && namespaces?.namespaces?.length) {
      setActiveNamespace(namespaces.namespaces[0]);
    }
  }, [activeNamespace, queryClient]);


  const handleSendMessage = (content: string) => {
    if (!sessionId) {
      toast({
        variant: "destructive",
        title: "جلسة غير جاهزة",
        description: "يرجى الانتظار قليلاً ثم المحاولة مرة أخرى.",
      });
      return;
    }
    sendMessageMutation.mutate(content);
  };

  // Allow manual reset of the session and the redis-backed cache for the current browser.
  const resetSession = () => {
    const storageKey = userId ? `chat_session_id:${userId}` : "chat_session_id";
    try {
      localStorage.removeItem(storageKey);
    } catch (e) {
      // ignore
    }
    const id = uuidv4();
    try {
      localStorage.setItem(storageKey, id);
    } catch (e) {
      // ignore
    }
    setSessionId(id);
    // Invalidate everything under /api/chat so UI picks up new session.
    queryClient.invalidateQueries({ queryKey: ["/api/chat"] });
  };

  return (
    <div className="flex h-screen">
      <Sidebar
  activeNamespace={activeNamespace}
  setActiveNamespace={(ns) => setActiveNamespace(ns)}
/>

    <div className="flex flex-col h-screen bg-neutral-50">
      <Header />

      <div className="flex flex-col" style={{ height: "calc(100vh - 4rem)" }}>
        {/* Chat Title */}
        <div className="bg-white border-b border-neutral-100 py-4 px-6">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-2xl font-bold text-neutral-900 mb-2">مساعد إدارة التطوع الذكي</h1>
            <p className="text-neutral-600">مساعدك الذكي للحصول على المعلومات حول الفرص التطوعية والأنشطة الخيرية</p>
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto px-4 py-6 scrollbar-thin">
          <div className="max-w-4xl mx-auto space-y-4">
            {/* Welcome Message - show only after session is ready */}
            {messages.length === 0 && !isLoading && !!sessionId && (
              <div className="flex items-start space-x-3 space-x-reverse message-animation">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#F69059' }}>
                    <Bot className="w-5 h-5 text-white" />
                  </div>
                </div>
                <div className="flex-1 max-w-lg">
                  <div className="bg-white rounded-2xl rounded-tr-sm px-4 py-3 shadow-sm border border-neutral-100">
                    <p className="text-neutral-800 leading-relaxed">
                      أهلاً وسهلاً بك في مساعد إدارة التطوع الذكي!
                      <br /><br />
                      يمكنني مساعدتك في العثور على الفرص التطوعية المناسبة، معرفة تفاصيل الأنشطة، أو الإجابة على أي استفسارات حول التطوع في الجمعية.
                      <br /><br />
                      كيف يمكنني مساعدتك اليوم؟
                    </p>
                  </div>
                  <div className="text-xs text-neutral-500 mt-1 mr-4">الآن</div>
                </div>
              </div>
            )}

            {/* Chat Messages */}
            {messages.map((message) => (
              <MessageBubble key={message.id} message={message} />
            ))}

            {/* Loading State */}
            {sendMessageMutation.isPending && (
              <div className="flex items-start space-x-3 space-x-reverse">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#F69059' }}>
                    <Bot className="w-5 h-5 text-white" />
                  </div>
                </div>
                <div className="flex-1 max-w-lg">
                  <div className="bg-white rounded-2xl rounded-tr-sm px-4 py-3 shadow-sm border border-neutral-100">
                    <div className="flex items-center space-x-1 space-x-reverse">
                      <div className="typing-indicator w-2 h-2 bg-neutral-400 rounded-full"></div>
                      <div className="typing-indicator w-2 h-2 bg-neutral-400 rounded-full"></div>
                      <div className="typing-indicator w-2 h-2 bg-neutral-400 rounded-full"></div>
                      <span className="text-neutral-600 text-sm mr-2">المساعد يكتب...</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input Area */}
        <ChatInput onSendMessage={handleSendMessage} isLoading={sendMessageMutation.isPending} />

        {/* Optional debug / reset button (uncomment if you want a manual clear) */}
        {/*
        <div className="p-2">
          <button onClick={resetSession} className="text-sm text-red-600">Reset session (clear local cache)</button>
        </div>
        */}
      </div>
    </div>
    </div>
  );
}
