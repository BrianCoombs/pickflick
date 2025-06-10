/*
<ai_context>
This client component provides the features section for the landing page.
</ai_context>
*/

"use client"

import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card"
import { motion } from "framer-motion"
import {
  Film,
  Users,
  Zap,
  LucideIcon,
  Heart,
  Sparkles,
  Globe
} from "lucide-react"

interface FeatureProps {
  title: string
  description: string
  icon: LucideIcon
}

const features: FeatureProps[] = [
  {
    title: "Swipe Together",
    description:
      "Create sessions and swipe through movies with friends in real-time",
    icon: Users
  },
  {
    title: "Instant Matches",
    description:
      "Get notified the moment everyone swipes right on the same movie",
    icon: Zap
  },
  {
    title: "Smart Recommendations",
    description: "AI-powered suggestions based on your group's preferences",
    icon: Sparkles
  },
  {
    title: "Multiple Sources",
    description: "Connect your Letterboxd, Plex, and streaming services",
    icon: Globe
  },
  {
    title: "Movie Database",
    description: "Access millions of movies with ratings, trailers, and more",
    icon: Film
  },
  {
    title: "Save Favorites",
    description: "Build watchlists and track movies you've loved",
    icon: Heart
  }
]

const FeatureCard = ({ title, description, icon: Icon }: FeatureProps) => (
  <motion.div
    whileHover={{ scale: 1.05 }}
    transition={{ type: "spring", stiffness: 300 }}
    className="transform-gpu"
  >
    <Card className="group transition-shadow duration-200 hover:shadow-lg">
      <CardHeader>
        <Icon className="text-primary mb-2 size-12" />
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
    </Card>
  </motion.div>
)

export const FeaturesSection = () => {
  return (
    <section className="mt-20 bg-gradient-to-b from-gray-50 to-white py-20 dark:from-gray-800 dark:to-gray-900">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          <h2 className="mb-12 text-center text-4xl font-bold">
            How PickFlick Works
          </h2>
          <div className="mx-auto grid max-w-6xl grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
            {features.map((feature, index) => (
              <FeatureCard key={index} {...feature} />
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  )
}
