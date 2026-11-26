/**
 * Pending action toasts
 *
 * The undo feature's feedback (issue #36): a snackbar per pending action
 * event — the queued message carries the "Ongedaan maken" action, and
 * the result (performed, failed, cancelled) follows in the same toast
 * once the delay has passed. All UI text is inline in Dutch. The queued
 * toast stays open until the action settles (approx. the delay); result
 * toasts auto-hide.
 */
import Alert from "@mui/material/Alert";
import type { AlertColor } from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Snackbar from "@mui/material/Snackbar";
import React from "react";
import type { ActionToast } from "../hooks/usePendingActions.ts";
import type { PendingAction, PendingActionEvent } from "../services/index.ts";

/**
 * Props for PendingActionToasts
 */
export interface PendingActionToastsProps {
  /** The toast to show: the latest pending action event and its open state */
  toast: ActionToast | null;
  /** How many actions are still queued; while > 0 the undo action shows */
  pendingCount: number;
  /** Undo: cancel every pending action */
  onUndo: () => void;
  /** Dismiss the toast */
  onDismiss: () => void;
}

/**
 * The queued message: the action is queued and will be performed soon
 */
function QueuedMessage(
  { action }: { action: PendingAction },
): React.JSX.Element {
  if (action.kind === "create") {
    return <>Boeking "{action.label}" wordt binnenkort aangemaakt.</>;
  }
  if (action.kind === "update") {
    return <>Boeking "{action.label}" wordt binnenkort bijgewerkt.</>;
  }
  return <>Boeking "{action.label}" wordt binnenkort verwijderd.</>;
}

/**
 * The performed message: the write succeeded after the delay
 */
function PerformedMessage(
  { action }: { action: PendingAction },
): React.JSX.Element {
  if (action.kind === "create") {
    return <>Boeking "{action.label}" is aangemaakt.</>;
  }
  if (action.kind === "update") {
    return <>Boeking "{action.label}" is bijgewerkt.</>;
  }
  return <>Boeking "{action.label}" is verwijderd.</>;
}

/**
 * The failed message: the write threw, the error is shown
 */
function FailedMessage(
  { event }: { event: PendingActionEvent & { type: "failed" } },
): React.JSX.Element {
  const { action } = event;
  const message = event.error instanceof Error
    ? event.error.message
    : String(event.error);
  if (action.kind === "create") {
    return <>Boeking "{action.label}" kan niet worden aangemaakt - {message}</>;
  }
  if (action.kind === "update") {
    return <>Boeking "{action.label}" kan niet worden bijgewerkt - {message}</>;
  }
  return <>Boeking "{action.label}" kan niet worden verwijderd - {message}</>;
}

/**
 * The cancelled message: undo removed the action before it was performed
 */
function CancelledMessage(
  { action }: { action: PendingAction },
): React.JSX.Element {
  if (action.kind === "create") {
    return <>Boeking "{action.label}" aanmaken is geannuleerd.</>;
  }
  if (action.kind === "update") {
    return <>Boeking "{action.label}" bijwerken is geannuleerd.</>;
  }
  return <>Boeking "{action.label}" verwijderen is geannuleerd.</>;
}

/**
 * The severity of an event's toast
 */
function severityOf(event: PendingActionEvent): AlertColor {
  if (event.type === "performed") return "success";
  if (event.type === "failed") return "error";
  return "info";
}

/**
 * The toast for the latest pending action event, with the undo action
 * while actions are still queued (issue #36)
 */
export function PendingActionToasts(
  { toast, pendingCount, onUndo, onDismiss }: PendingActionToastsProps,
): React.JSX.Element | null {
  if (toast === null) {
    return null;
  }
  const { event } = toast;
  const queued = event.type === "queued";

  return (
    <Snackbar
      open={toast.open}
      anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
      autoHideDuration={queued ? null : 6000}
      onClose={(_, reason) => {
        if (reason !== "clickaway") onDismiss();
      }}
    >
      <Alert
        severity={severityOf(event)}
        onClose={queued ? undefined : onDismiss}
        action={pendingCount > 0
          ? (
            <Button color="inherit" size="small" onClick={onUndo}>
              Ongedaan maken
            </Button>
          )
          : undefined}
      >
        {event.type === "queued" && <QueuedMessage action={event.action} />}
        {event.type === "performed" && (
          <PerformedMessage action={event.action} />
        )}
        {event.type === "failed" && <FailedMessage event={event} />}
        {event.type === "cancelled" && (
          <CancelledMessage action={event.action} />
        )}
      </Alert>
    </Snackbar>
  );
}
