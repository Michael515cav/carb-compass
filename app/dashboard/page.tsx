import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { DashboardClient } from './DashboardClient'

export const metadata = { title: 'My Dashboard' }

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const [profileRes, historyRes, savedRes] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase.from('food_history').select('*').eq('user_id', user.id).order('searched_at', { ascending: false }).limit(20),
    supabase.from('saved_recipes').select('recipe_id').eq('user_id', user.id),
  ])

  return (
    <DashboardClient
      user={{ email: user.email || '' }}
      profile={profileRes.data}
      foodHistory={historyRes.data || []}
      savedRecipeIds={(savedRes.data || []).map((r: {recipe_id: string}) => r.recipe_id)}
    />
  )
}
