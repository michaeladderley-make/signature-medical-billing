"use client";

import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ChatMessage } from "@/lib/claim-assistant";

type ComposerProps = {
  prompt: string;
  disabled?: boolean;
  inputRef?: React.RefObject<HTMLInputElement | null>;
  onPromptChange: (value: string) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
};

export function ClaimComposer({
  prompt,
  disabled,
  inputRef,
  onPromptChange,
  onSubmit,
}: ComposerProps) {
  return (
    <form onSubmit={onSubmit} className="flex items-center gap-3 px-4 pb-4">
      <Input
        ref={inputRef}
        value={prompt}
        onChange={(event) => onPromptChange(event.target.value)}
        placeholder="What can I help you with?"
        aria-label="Ask about this claim"
        disabled={disabled}
        className="h-10 rounded-[10px] border-slate-edge bg-graphite px-3 text-sm placeholder:text-mist"
      />
      <Button
        type="submit"
        disabled={disabled || prompt.trim().length === 0}
        className="h-10 rounded-[10px] px-3.5"
      >
        Submit
      </Button>
    </form>
  );
}

type SheetProps = {
  patient: string;
  number: string;
  messages: ChatMessage[];
  pending: boolean;
  prompt: string;
  onPromptChange: (value: string) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  onClose: () => void;
};

export function ClaimChatSheet({
  patient,
  number,
  messages,
  pending,
  prompt,
  onPromptChange,
  onSubmit,
  onClose,
}: SheetProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const node = logRef.current;
    if (!node) return;
    node.scrollTop = node.scrollHeight;
  }, [messages, pending]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div
      role="region"
      aria-label={`Assistant for ${patient}`}
      className="absolute inset-x-0 bottom-0 z-10 flex h-1/2 flex-col rounded-t-[12px] border border-b-0 border-slate-edge bg-iron shadow-[0_-20px_48px_rgba(0,0,0,0.55)]"
    >
      <div className="flex items-center justify-between border-b border-slate-edge px-4 py-3">
        <div className="min-w-0">
          <p className="eyebrow">Assistant</p>
          <p className="truncate text-sm text-bone">
            {patient}
            <span className="text-ash"> · {number}</span>
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-caption text-ash hover:text-bone"
        >
          Close
        </button>
      </div>

      <div ref={logRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-3">
        {messages.map((message) => (
          <div
            key={message.id}
            className={
              message.role === "user"
                ? "ml-auto max-w-[85%] rounded-[10px] bg-graphite px-3 py-2 text-sm leading-normal text-bone"
                : "mr-auto max-w-[85%] text-sm leading-normal text-bone"
            }
          >
            {message.role === "assistant" ? (
              <p className="eyebrow mb-1">Reply</p>
            ) : null}
            <p>{message.text}</p>
          </div>
        ))}
        {pending ? (
          <p className="text-sm text-ash">Looking at this claim…</p>
        ) : null}
      </div>

      <ClaimComposer
        prompt={prompt}
        inputRef={inputRef}
        onPromptChange={onPromptChange}
        onSubmit={onSubmit}
      />
    </div>
  );
}
