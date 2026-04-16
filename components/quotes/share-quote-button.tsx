"use client";

import { useState } from "react";
import { Copy, Check, Send, Share2 } from "lucide-react";

import { Button } from "@/components/ui/button";

interface ShareQuoteButtonProps {
  shareUrl: string;
  clientEmail?: string;
  clientName?: string;
  quoteTitle?: string;
}

export function ShareQuoteButton({
  shareUrl,
  clientEmail,
  clientName,
  quoteTitle,
}: ShareQuoteButtonProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textArea = document.createElement("textarea");
      textArea.value = shareUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  function handleEmail() {
    const subject = encodeURIComponent(
      quoteTitle ? `Your quote: ${quoteTitle}` : "Your painting quote"
    );
    const greeting = clientName ? `Hi ${clientName},` : "Hi,";
    const body = encodeURIComponent(
      `${greeting}\n\nHere is your painting quote:\n${shareUrl}\n\nPlease let me know if you have any questions.\n\nThank you!`
    );
    const mailto = clientEmail
      ? `mailto:${clientEmail}?subject=${subject}&body=${body}`
      : `mailto:?subject=${subject}&body=${body}`;
    window.open(mailto, "_blank");
  }

  async function handleShare() {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: quoteTitle ?? "Painting Quote",
          url: shareUrl,
        });
      } catch {
        // User cancelled or share failed — fall back to copy
        handleCopy();
      }
    } else {
      handleCopy();
    }
  }

  return (
    <div className="flex gap-2">
      <Button variant="secondary" size="sm" onClick={handleCopy}>
        {copied ? (
          <Check className="h-4 w-4" />
        ) : (
          <Copy className="h-4 w-4" />
        )}
        {copied ? "Copied!" : "Copy Link"}
      </Button>

      <Button variant="ghost" size="sm" onClick={handleEmail}>
        <Send className="h-4 w-4" />
        Send
      </Button>

      <Button variant="ghost" size="icon" onClick={handleShare}>
        <Share2 className="h-4 w-4" />
      </Button>
    </div>
  );
}
