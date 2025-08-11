import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Paperclip } from "lucide-react";

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  isLoading: boolean;
}

export function ChatInput({ onSendMessage, isLoading }: ChatInputProps) {
  const [message, setMessage] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedMessage = message.trim();
    if (!trimmedMessage || isLoading) return;

    onSendMessage(trimmedMessage);
    setMessage("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const quickActions = [
    "ما هي الاخلاقيات المذمومة بالتطوع؟",
    "تعريف التطوع",
  ];

  return (
    <div className="bg-white border-t border-neutral-100 px-4 py-4">
      <div className="max-w-4xl mx-auto">
        <form onSubmit={handleSubmit} className="flex items-end space-x-3 space-x-reverse">
          <div className="flex-1">
            <div className="relative">
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="اكتب رسالتك هنا..."
                className="resize-none rounded-2xl border border-neutral-200 px-4 py-3 pr-4 pl-12 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 text-neutral-800 leading-relaxed min-h-[44px] max-h-[120px]"
                rows={1}
                disabled={isLoading}
              />
              <button
                type="button"
                className="absolute left-3 bottom-3 text-neutral-400 hover:text-neutral-600 transition-colors"
              >
                <Paperclip className="w-5 h-5" />
              </button>
            </div>
          </div>
          <Button
            type="submit"
            disabled={!message.trim() || isLoading}
            className="text-white rounded-2xl px-6 py-3 transition-colors duration-200 min-w-[44px] disabled:opacity-50 hover:opacity-90"
            style={{ backgroundColor: '#1CBAB5' }}
          >
            <Send className="w-5 h-5" />
          </Button>
        </form>

        <div className="mt-3 flex flex-wrap gap-2 justify-center">
          {quickActions.map((action) => (
            <button
              key={action}
              onClick={() => setMessage(action)}
              className="bg-neutral-100 hover:bg-neutral-200 text-neutral-700 px-3 py-2 rounded-full text-sm transition-colors"
            >
              {action}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
