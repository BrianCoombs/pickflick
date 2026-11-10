"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { auth } from "@/lib/auth/server"

export async function loginAction(formData: FormData) {
  const { error } = await auth.signIn.email({
    email: formData.get("email") as string,
    password: formData.get("password") as string
  })

  if (error) {
    return { error: error.message || "Failed to sign in. Try again." }
  }

  revalidatePath("/", "layout")
  redirect("/sessions")
}

export async function signupAction(formData: FormData) {
  const email = formData.get("email") as string

  const { error } = await auth.signUp.email({
    email,
    // Better Auth requires a display name; the form only asks for email.
    name: email.split("@")[0],
    password: formData.get("password") as string
  })

  if (error) {
    return { error: error.message || "Failed to create account." }
  }

  revalidatePath("/", "layout")
  redirect("/sessions")
}

export async function signOutAction() {
  await auth.signOut()
  revalidatePath("/", "layout")
  redirect("/")
}
