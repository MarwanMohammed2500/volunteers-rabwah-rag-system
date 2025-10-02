import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Header } from "./header";
import { Sidebar, ChatNamespace } from "./sidebar";
import { MessageBubble } from "./message-bubble";
import { ChatInput } from "./chat-input";
import { apiRequest } from "@/lib/queryClient";
import { ChatMessage } from "@shared/schema";
import { Bot, Menu, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { v4 as uuidv4 } from "uuid";

function getOrCreateSessionId(namespace: ChatNamespace): string {
  if (typeof window === "undefined") {
    return uuidv4();
  }
  const storageKey = `chatSessionId_${namespace}`;
  const storedSessionId = localStorage.getItem(storageKey);
  if (storedSessionId) return storedSessionId;
  const newSessionId = uuidv4();
  localStorage.setItem(storageKey, newSessionId);
  return newSessionId;
}

export function ChatInterface() {
  const [activeNamespace, setActiveNamespace] = useState<ChatNamespace>("");
  const [sessionId, setSessionId] = useState<string>("");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch namespaces
  const {
    data: namespaces = [],
    isLoading: namespacesLoading,
  } = useQuery({
    queryKey: ["namespaces"],
    queryFn: async () => {
      const res = await fetch("/api/chat/namespaces", { method: "GET" });
      if (!res.ok) throw new Error(`Failed: ${res.status}`);
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    },
    refetchOnWindowFocus: false,
    staleTime: 1000 * 60,
  });

  const displayNamespaces = Array.isArray(namespaces) ? namespaces : [];

  // Initialize namespace + sessionId once namespaces arrive
  useEffect(() => {
    if (displayNamespaces.length === 0) return;
    if (!activeNamespace || !displayNamespaces.includes(activeNamespace)) {
      const firstNs = displayNamespaces[0];
      setActiveNamespace(firstNs);
      const id = getOrCreateSessionId(firstNs);
      setSessionId(id);
    }
  }, [displayNamespaces, activeNamespace]);

  // Update sessionId when activeNamespace changes
  useEffect(() => {
    if (!activeNamespace) return;
    const id = getOrCreateSessionId(activeNamespace);
    setSessionId(id);
  }, [activeNamespace]);

  // Messages query
  const { data: messages = [], isLoading } = useQuery<ChatMessage[]>({
    queryKey: ["/api/chat", activeNamespace, sessionId, "messages"],
    enabled: Boolean(activeNamespace && sessionId),
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const resp = await apiRequest("GET", `/api/chat/${activeNamespace}/${sessionId}/messages`);
      if (resp && typeof (resp as any).json === "function") {
        return (await (resp as any).json()) as ChatMessage[];
      }
      return (resp as ChatMessage[]) || [];
    },
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      if (!sessionId || !activeNamespace) {
        throw new Error("Session ID or namespace not available");
      }
      const resp = await apiRequest(
        "POST",
        `/api/chat/${activeNamespace}/${sessionId}/message`,
        { content }
      );
      if (resp && typeof (resp as any).json === "function") {
        return (await (resp as any).json());
      }
      return resp;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/chat", activeNamespace, sessionId, "messages"],
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "خطأ في الإرسال",
        description: "حدث خطأ أثناء إرسال الرسالة. يرجى المحاولة مرة أخرى.",
      });
    },
  });

  const handleNamespaceChange = (namespace: ChatNamespace) => {
    if (namespace === activeNamespace) return;
    setActiveNamespace(namespace);
    if (window.innerWidth < 1024) {
      setSidebarOpen(false);
    }
  };

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = (content: string) => {
    if (!sessionId || !activeNamespace) return;
    sendMessageMutation.mutate(content);
  };

  const getNamespaceTitle = (namespace: string): string => {
    const titles: { [key: string]: string } = {
      volunteer: "التطوع",
      events: "الفعاليات",
      faq: "الأسئلة الشائعة",
      general: "المساعد العام",
    };
    return titles[namespace] || (namespace ? namespace.charAt(0).toUpperCase() + namespace.slice(1) : "");
  };

  const welcomeMessage = `أهلاً وسهلاً بك في مساعد إدارة التطوع الذكي!

يمكنني مساعدتك في العثور على الفرص التطوعية المناسبة، معرفة تفاصيل الأنشطة، أو الإجابة على أي استفسارات حول التطوع في الجمعية.

كيف يمكنني مساعدتك اليوم؟`;

  return (
    <div className="flex h-screen bg-neutral-50">
      {sidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div
        className={`
          fixed lg:static inset-y-0 left-0 z-50
          transform transition-transform duration-300 ease-in-out
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
          lg:translate-x-0 lg:relative
        `}
      >
        <Sidebar
          activeNamespace={activeNamespace}
          onNamespaceChange={handleNamespaceChange}
          namespaces={displayNamespaces}
          loading={namespacesLoading}
        />
      </div>

      <div className="flex-1 flex flex-col min-w-0">
        <Header />

        <div className="lg:hidden bg-white border-b border-neutral-100 p-4 flex items-center justify-between">
          <button
            onClick={toggleSidebar}
            className="p-2 rounded-lg bg-neutral-100 hover:bg-neutral-200 transition-colors"
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <div className="text-center flex-1">
            <h2 className="font-semibold text-neutral-900">{getNamespaceTitle(activeNamespace)}</h2>
          </div>
          <div className="w-10" />
        </div>

        <div className="flex flex-col flex-1" style={{ height: "calc(100vh - 4rem)" }}>
          <div className="bg-white border-b border-neutral-100 py-4 px-6 hidden lg:block">
            <div className="max-w-4xl mx-auto text-center">
              <h1 className="text-2xl font-bold text-neutral-900 mb-2">
                {getNamespaceTitle(activeNamespace)}
              </h1>
            </div>
          </div>

          {/* Messages area */}
          <div className="flex-1 overflow-y-auto px-4 py-6 scrollbar-thin">
            <div className="max-w-4xl mx-auto space-y-4">
              {(!sessionId || !activeNamespace) ? (
                <div className="flex items-center justify-center h-full">
                  <p className="text-neutral-600">جاري تحميل المحادثة...</p>
                </div>
              ) : (
                <>
                  {messages.length === 0 && !isLoading && (
                    <div className="flex items-start space-x-3 space-x-reverse message-animation">
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
                          <p className="text-neutral-800 leading-relaxed whitespace-pre-line">
                            {welcomeMessage}
                          </p>
                        </div>
                        <div className="text-xs text-neutral-500 mt-1 mr-4">الآن</div>
                      </div>
                    </div>
                  )}

                  {messages.map((message) => (
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
                            <span className="text-neutral-600 text-sm mr-2">المساعد يكتب...</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </>
              )}
            </div>
          </div>

          <ChatInput
            onSendMessage={handleSendMessage}
            isLoading={sendMessageMutation.isPending}
          />
        </div>
      </div>
    </div>
  );
}