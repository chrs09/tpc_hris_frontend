import React, { useEffect, useState } from "react";
import { Button } from "../button/Button";
import { subscribeDialogHost } from "./dialogService";

// Renders whatever dialog (alert/confirm/prompt) is currently requested via
// dialogService. Mounted once at the app root -- see App.jsx.
const DialogHost = () => {
  const [dialog, setDialog] = useState(null);
  const [promptValue, setPromptValue] = useState("");

  useEffect(() => {
    return subscribeDialogHost((next) => {
      setPromptValue(next.defaultValue || "");
      setDialog(next);
    });
  }, []);

  if (!dialog) return null;

  const close = (result) => {
    dialog.resolve(result);
    setDialog(null);
  };

  const isDestructive = dialog.type === "confirm" && dialog.danger !== false;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={() => {
        if (dialog.type === "alert") close(undefined);
      }}
    >
      <div
        className="bg-surface border border-border w-full max-w-sm rounded-2xl shadow-2xl p-6 animate-fadeIn"
        onClick={(e) => e.stopPropagation()}
      >
        {dialog.title && (
          <h2 className="text-lg font-bold text-fg mb-2">{dialog.title}</h2>
        )}

        <p className="text-fg-muted whitespace-pre-line text-sm mb-5">
          {dialog.message}
        </p>

        {dialog.type === "prompt" && (
          <input
            autoFocus
            type="text"
            value={promptValue}
            onChange={(e) => setPromptValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") close(promptValue);
              if (e.key === "Escape") close(null);
            }}
            className="w-full mb-5 rounded-lg border border-border bg-background px-3 py-2 text-sm text-fg focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
          />
        )}

        <div className="flex justify-end gap-2">
          {(dialog.type === "confirm" || dialog.type === "prompt") && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => close(dialog.type === "confirm" ? false : null)}
            >
              {dialog.cancelText || "Cancel"}
            </Button>
          )}

          <Button
            variant={isDestructive ? "destructive" : "default"}
            size="sm"
            autoFocus={dialog.type !== "prompt"}
            onClick={() =>
              close(dialog.type === "prompt" ? promptValue : true)
            }
          >
            {dialog.confirmText || (dialog.type === "alert" ? "OK" : "Confirm")}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default DialogHost;
