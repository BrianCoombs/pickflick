"use client"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from "@/components/ui/alert-dialog"

// Shown to everyone but the host after the host saves new settings mid-session
export function ResetNotice({
  open,
  onAcknowledge
}: {
  open: boolean
  onAcknowledge: () => void
}) {
  return (
    <AlertDialog
      open={open}
      onOpenChange={next => {
        if (!next) onAcknowledge()
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Session reset</AlertDialogTitle>
          <AlertDialogDescription>
            The host changed the settings and reset the session. Start swiping
            again.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          {/* Closing the dialog calls onAcknowledge once, via onOpenChange */}
          <AlertDialogAction>Start swiping</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
