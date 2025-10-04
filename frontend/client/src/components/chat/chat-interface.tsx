import React, { useEffect, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Header } from "./header";
import { Sidebar } from "./sidebar";
import { MessageBubble } from "./message-bubble";
import { ChatInput } from "./chat-input";
import { apiRequest } from "@/lib/queryClient";
import { ChatMessage } from "@shared/schema";
import { Bot } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { v4 as uuidv4 } from "uuid";

type Props = {
  userId?: string | null;
};

export function ChatInterface({ userId }: Props) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [activeNamespace, setActiveNamespace] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // SSR-safe localStorage-backed session id
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
    } catch {
      setSessionId(uuidv4());
    }
  }, [sessionId, userId]);

  // Messages query depends on both namespace and session
  const { data: messages = [], isLoading } = useQuery<ChatMessage[]>({
    queryKey: ["/api/chat", activeNamespace, sessionId, "messages"],
    queryFn: async () => {
      if (!sessionId || !activeNamespace) return [];
      const res = await apiRequest(
        "GET",
        `/api/chat/${activeNamespace}/${sessionId}/messages`
      );
      if (!res.ok) throw new Error("Failed to fetch messages");
      return res.json();
    },
    enabled: !!sessionId && !!activeNamespace,
    staleTime: 0,
    refetchOnWindowFocus: false,
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      if (!sessionId || !activeNamespace)
        throw new Error("Missing session or namespace");
      const response = await apiRequest(
        "POST",
        `/api/chat/${activeNamespace}/${sessionId}/message`,
        { content }
      );
      if (!response.ok) throw new Error("Failed to send message");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/chat", activeNamespace, sessionId, "messages"],
      });
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "خطأ في الإرسال",
        description: "حدث خطأ أثناء إرسال الرسالة. يرجى المحاولة مرة أخرى.",
      });
    },
  });

  const handleSendMessage = (content: string) => {
    if (!sessionId || !activeNamespace) {
      toast({
        variant: "destructive",
        title: "الجلسة غير جاهزة",
        description: "يرجى اختيار مساحة محادثة أولاً.",
      });
      return;
    }
    sendMessageMutation.mutate(content);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };
  useEffect(scrollToBottom, [messages]);

  return (
    <div className="flex flex-col h-screen bg-neutral-50">
      <Header />
      <div className="flex flex-row" style={{ height: "calc(100vh - 4rem)" }}>
        {/* Sidebar */}
        <Sidebar
          activeNamespace={activeNamespace}
          setActiveNamespace={setActiveNamespace}
        />

        {/* Chat Area */}
        <div className="flex flex-col flex-1">
          <div className="bg-white border-b border-neutral-100 py-4 px-6">
            <div className="max-w-4xl mx-auto text-center">
              <h1 className="text-2xl font-bold text-neutral-900 mb-2">
                {activeNamespace
                  ? `محادثة: ${activeNamespace}`
                  : "اختر مساحة محادثة"}
              </h1>
              <p className="text-neutral-600">
                مساعدك الذكي لإدارة التطوع والأنشطة الخيرية
              </p>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-6 scrollbar-thin">
            <div className="max-w-4xl mx-auto space-y-4">
              {!activeNamespace && (
                <div className="text-center text-neutral-500 mt-20">
                  اختر مساحة محادثة من الشريط الجانبي للبدء.
                </div>
              )}

              {activeNamespace && messages.length === 0 && !isLoading && (
                <div className="flex items-start space-x-3 space-x-reverse">
                  <div className="flex-shrink-0">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: "#F69059" }}
                    >
                      <Bot className="w-5 h-5 text-white" />
                    </div>
                  </div>
                  <div className="flex-1 max-w-lg">
                    <div className="bg-white rounded-2xl rounded-tr-sm px-4 py-3 shadow-sm border border-neutral-100">
                      <p className="text-neutral-800 leading-relaxed">
                        أهلاً بك في {activeNamespace}. ابدأ الحديث الآن.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {activeNamespace &&
                messages.map((message) => (
                  <MessageBubble key={message.id} message={message} />
                ))}

              {sendMessageMutation.isPending && (
                <div className="flex items-start space-x-3 space-x-reverse">
                  <div className="flex-shrink-0">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: "#F69059" }}
                    >
                      <Bot className="w-5 h-5 text-white" />
                    </div>
                  </div>
                  <div className="flex-1 max-w-lg">
                    <div className="bg-white rounded-2xl rounded-tr-sm px-4 py-3 shadow-sm border border-neutral-100">
                      <div className="flex items-center space-x-1 space-x-reverse">
                        <div className="typing-indicator w-2 h-2 bg-neutral-400 rounded-full"></div>
                        <div className="typing-indicator w-2 h-2 bg-neutral-400 rounded-full"></div>
                        <div className="typing-indicator w-2 h-2 bg-neutral-400 rounded-full"></div>
                        <span className="text-neutral-600 text-sm mr-2">
                          المساعد يكتب...
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Input */}
          <ChatInput
            onSendMessage={handleSendMessage}
            isLoading={sendMessageMutation.isPending}
          />
        </div>
      </div>
    </div>
  );
}
