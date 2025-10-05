import { Bot, User } from "lucide-react";
import { ChatMessage } from "@shared/schema";
import { formatDistanceToNow } from "date-fns";
import { ar } from "date-fns/locale";

interface MessageBubbleProps {
  message: ChatMessage;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isBot = message.isBot;
  const timeAgo = message.timestamp && !isNaN(Date.parse(message.timestamp))
  ? formatDistanceToNow(new Date(message.timestamp), { addSuffix: true, locale: ar })
  : "";


  return (
    <div
      className={`flex items-start space-x-3 space-x-reverse message-animation ${
        !isBot ? "justify-end" : ""
      }`}
    >
      {isBot && (
        <div className="flex-shrink-0">
          <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#F69059' }}>
            <Bot className="w-5 h-5 text-white" />
          </div>
        </div>
      )}

      <div className="flex-1 max-w-lg">
        <div
          className={`rounded-2xl px-4 py-3 shadow-sm ${
            isBot
              ? "bg-white rounded-tr-sm border border-neutral-100"
              : "text-white rounded-tl-sm"
          }`}
          style={!isBot ? { backgroundColor: '#1CBAB5' } : {}}
        >
          <div
            className={`leading-relaxed whitespace-pre-wrap ${
              isBot ? "text-neutral-800" : "text-white"
            }`}
            dangerouslySetInnerHTML={{
              __html: (message.content ?? "")
                .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>"),
            }}
          />
        </div>
        <div
          className={`text-xs text-neutral-500 mt-1 ${
            isBot ? "mr-4" : "ml-4 text-left"
          }`}
        >
          {timeAgo}
        </div>
      </div>

      {!isBot && (
        <div className="flex-shrink-0">
          <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#1CBAB5' }}>
            <User className="w-5 h-5 text-white" />
          </div>
        </div>
      )}
    </div>
  );
}
