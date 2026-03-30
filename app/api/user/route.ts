import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [profile, history, saved] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase.from('food_history').select('*').eq('user_id', user.id).order('searched_at', { ascending: false }).limit(30),
    supabase.from('saved_recipes').select('recipe_id, recipes(*)').eq('user_id', user.id),
  ])

  return NextResponse.json({
    profile: profile.data,
    foodHistory: history.data || [],
    savedRecipes: saved.data || [],
  })
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { action } = body

  if (action === 'update_profile') {
    const { icr, correction_factor, target_bgl, display_name } = body
    const { error } = await supabase
      .from('profiles')
      .update({ icr, correction_factor, target_bgl, display_name, updated_at: new Date().toISOString() })
      .eq('id', user.id)
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ success: true })
  }

  if (action === 'log_food') {
    const { food_name, fdcid, carbs_per_100g, protein_per_100g, fat_per_100g, calories_per_100g } = body
    const { error } = await supabase.from('food_history').insert({
      user_id: user.id, food_name, fdcid, carbs_per_100g, protein_per_100g, fat_per_100g, calories_per_100g,
    })
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ success: true })
  }

  if (action === 'save_recipe') {
    const { recipe_id } = body
    const { error } = await supabase.from('saved_recipes').upsert({ user_id: user.id, recipe_id })
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ success: true })
  }

  if (action === 'unsave_recipe') {
    const { recipe_id } = body
    const { error } = await supabase.from('saved_recipes').delete().match({ user_id: user.id, recipe_id })
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ success: true })
  }

  if (action === 'add_freebie') {
    const { name, carbs_per_serving, serving_size, notes } = body
    const { error } = await supabase.from('freebie_foods').insert({
      user_id: user.id, name, carbs_per_serving, serving_size, notes, is_global: false,
    })
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}
