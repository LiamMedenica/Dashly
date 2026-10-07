"use server"

import { createAdminClient } from "@/utils/supabase/admin"

export async function deleteAccount(userId: string) {
  const admin = createAdminClient()
  const { error } = await admin.auth.admin.deleteUser(userId)
  if (error) return { error: error.message }
}
