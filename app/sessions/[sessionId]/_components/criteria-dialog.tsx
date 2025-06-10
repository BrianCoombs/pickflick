"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog"
import { updateSessionPreferences } from "@/actions/db/movies-actions"
import { toast } from "@/hooks/use-toast"
import { Settings2 } from "lucide-react"
import { MoviePreferencesForm } from "@/components/movie-preferences-form"

interface CriteriaDialogProps {
  sessionId: string
  currentPreferences?: any
}

export function CriteriaDialog({
  sessionId,
  currentPreferences
}: CriteriaDialogProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (preferences: any) => {
    setLoading(true)

    try {
      const result = await updateSessionPreferences(sessionId, preferences)

      if (result.isSuccess) {
        toast({
          title: "Criteria updated",
          description: "New movies will be loaded based on your preferences"
        })
        setOpen(false)
        // Reload the page to fetch new movies
        window.location.reload()
      } else {
        toast({
          title: "Error",
          description: result.message,
          variant: "destructive"
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update criteria",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Settings2 className="mr-2 size-4" />
          Change Criteria
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Update Movie Criteria</DialogTitle>
          <DialogDescription>
            Change your movie preferences. This will clear current swipes and
            load new movies.
          </DialogDescription>
        </DialogHeader>
        <MoviePreferencesForm
          mode="update"
          initialPreferences={currentPreferences}
          onSubmit={handleSubmit}
          submitLabel="Update Criteria"
          loading={loading}
        />
      </DialogContent>
    </Dialog>
  )
}
