/*
<ai_context>
This client component provides the hero section for the landing page.
</ai_context>
*/

"use client"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { motion } from "framer-motion"
import { ChevronRight, Film, Users, Heart } from "lucide-react"
import Link from "next/link"
import posthog from "posthog-js"
import AnimatedGradientText from "../magicui/animated-gradient-text"
import HeroVideoDialog from "../magicui/hero-video-dialog"

export const HeroSection = () => {
  const handleGetStartedClick = () => {
    posthog.capture("clicked_get_started")
  }

  return (
    <div className="flex flex-col items-center justify-center px-8 pt-32 text-center">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="flex items-center justify-center"
      >
        <Link href="/signup">
          <AnimatedGradientText>
            🎬 <hr className="mx-2 h-4 w-px shrink-0 bg-gray-300" />
            <span
              className={cn(
                `animate-gradient inline bg-gradient-to-r from-[#ffaa40] via-[#9c40ff] to-[#ffaa40] bg-[length:var(--bg-size)_100%] bg-clip-text text-transparent`
              )}
            >
              Find your next movie in seconds
            </span>
            <ChevronRight className="ml-1 size-3 transition-transform duration-300 ease-in-out group-hover:translate-x-0.5" />
          </AnimatedGradientText>
        </Link>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
        className="mt-8 flex max-w-2xl flex-col items-center justify-center gap-6"
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.4, ease: "easeOut" }}
          className="text-balance text-6xl font-bold"
        >
          Never argue about movie night again.
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.6, ease: "easeOut" }}
          className="max-w-xl text-balance text-xl"
        >
          Swipe through movies with friends and instantly find the perfect film
          everyone wants to watch.
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.8, ease: "easeOut" }}
        >
          <Link href="/signup" onClick={handleGetStartedClick}>
            <Button className="bg-blue-500 text-lg hover:bg-blue-600">
              <Film className="mr-2 size-5" />
              Start Swiping &rarr;
            </Button>
          </Link>
        </motion.div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, delay: 1, ease: "easeOut" }}
        className="mx-auto mt-20 flex w-full max-w-screen-lg items-center justify-center"
      >
        <div className="relative flex w-full items-center justify-center py-16">
          <div className="absolute inset-0 rounded-lg bg-gradient-to-b from-blue-500/10 to-purple-500/10 blur-3xl" />
          <div className="relative flex gap-8">
            <motion.div
              initial={{ rotate: -6 }}
              animate={{ rotate: -6 }}
              whileHover={{ rotate: 0, scale: 1.05 }}
              transition={{ type: "spring", stiffness: 300 }}
              className="flex h-72 w-48 flex-col items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-red-600 p-6 shadow-2xl"
            >
              <Film className="mb-4 size-16 text-white" />
              <div className="text-center text-white">
                <div className="text-2xl font-bold">Action</div>
                <div className="mt-2 text-sm opacity-90">Swipe right</div>
              </div>
            </motion.div>

            <motion.div
              initial={{ rotate: 0 }}
              animate={{ rotate: 0 }}
              whileHover={{ scale: 1.05 }}
              transition={{ type: "spring", stiffness: 300 }}
              className="flex h-72 w-48 flex-col items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 p-6 shadow-2xl"
            >
              <Heart className="mb-4 size-16 text-white" />
              <div className="text-center text-white">
                <div className="text-2xl font-bold">Romance</div>
                <div className="mt-2 text-sm opacity-90">Match found!</div>
              </div>
            </motion.div>

            <motion.div
              initial={{ rotate: 6 }}
              animate={{ rotate: 6 }}
              whileHover={{ rotate: 0, scale: 1.05 }}
              transition={{ type: "spring", stiffness: 300 }}
              className="flex h-72 w-48 flex-col items-center justify-center rounded-xl bg-gradient-to-br from-green-500 to-teal-600 p-6 shadow-2xl"
            >
              <Users className="mb-4 size-16 text-white" />
              <div className="text-center text-white">
                <div className="text-2xl font-bold">Comedy</div>
                <div className="mt-2 text-sm opacity-90">2 friends swiping</div>
              </div>
            </motion.div>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
