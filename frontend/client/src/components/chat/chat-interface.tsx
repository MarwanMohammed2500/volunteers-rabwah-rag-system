import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Header } from "./header";
import { MessageBubble } from "./message-bubble";
import { ChatInput } from "./chat-input";
import { apiRequest } from "@/lib/queryClient";
import { ChatMessage } from "@shared/schema";
import { Bot } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { randomUUID } from "crypto";

export function ChatInterface() {
  const [sessionId] = useState(() => randomUUID());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: messages = [], isLoading, error } = useQuery<ChatMessage[]>({
    queryKey: ["/api/chat", sessionId, "messages"],
    staleTime: 0,
    refetchOnWindowFocus: false,
  });

  // Debug logging
  useEffect(() => {
    console.log("🔄 Session ID:", sessionId);
    console.log("📨 Current messages count:", messages.length);
    console.log("📨 Messages:", messages);
  }, [sessionId, messages]);

  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      console.log("📤 Sending message:", content);
      const response = await apiRequest("POST", `/api/chat/${sessionId}/message`, { content });
      const data = await response.json();
      console.log("📥 Backend response:", data);
      return data;
    },
    onSuccess: (data) => {
      console.log("✅ Message sent successfully, refreshing chat...");
      // Force refresh the messages to show both user and bot messages
      queryClient.invalidateQueries({ queryKey: ["/api/chat", sessionId, "messages"] });
    },
    onError: (error) => {
      console.error("❌ Send message error:", error);
      toast({
        variant: "destructive",
        title: "خطأ في الإرسال",
        description: "حدث خطأ أثناء إرسال الرسالة. يرجى المحاولة مرة أخرى.",
      });
    },
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = (content: string) => {
    sendMessageMutation.mutate(content);
  };

  return (
    <div className="flex flex-col h-screen bg-neutral-50">
      <Header />
      
      <div className="flex flex-col" style={{ height: "calc(100vh - 4rem)" }}>
        {/* Chat Title */}
        <div className="bg-white border-b border-neutral-100 py-4 px-6">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-2xl font-bold text-neutral-900 mb-2">
              مساعد إدارة التطوع الذكي
            </h1>
            <p className="text-neutral-600">
              مساعدك الذكي للحصول على المعلومات حول الفرص التطوعية والأنشطة الخيرية
            </p>
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto px-4 py-6 scrollbar-thin">
          <div className="max-w-4xl mx-auto space-y-4">
            {/* Welcome Message */}
            {messages.length === 0 && !isLoading && (
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
        <ChatInput
          onSendMessage={handleSendMessage}
          isLoading={sendMessageMutation.isPending}
        />
      </div>
    </div>
  );
}
