import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)
  const category = searchParams.get('category')
  const postId = searchParams.get('postId')

  // Get comments for a specific post
  if (postId) {
    const { data, error } = await supabase
      .from('comments')
      .select('*, profiles(display_name, email)')
      .eq('post_id', postId)
      .order('created_at', { ascending: true })
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ comments: data })
  }

  // Get posts
  let query = supabase
    .from('posts')
    .select('*, profiles(display_name, email), comments(count)')
    .order('created_at', { ascending: false })

  if (category && category !== 'all') {
    query = query.eq('category', category)
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ posts: data })
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'You must be signed in to post' }, { status: 401 })

  const body = await request.json()
  const { action } = body

  if (action === 'create_post') {
    const { title, postBody, category } = body
    if (!title?.trim() || !postBody?.trim()) {
      return NextResponse.json({ error: 'Title and body are required' }, { status: 400 })
    }
    const { data, error } = await supabase
      .from('posts')
      .insert({ user_id: user.id, title: title.trim(), body: postBody.trim(), category })
      .select()
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ post: data })
  }

  if (action === 'add_comment') {
    const { post_id, commentBody } = body
    if (!commentBody?.trim()) return NextResponse.json({ error: 'Comment cannot be empty' }, { status: 400 })
    const { data, error } = await supabase
      .from('comments')
      .insert({ user_id: user.id, post_id, body: commentBody.trim() })
      .select('*, profiles(display_name, email)')
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ comment: data })
  }

  if (action === 'upvote') {
    const { post_id } = body
    // Check if already upvoted
    const { data: existing } = await supabase
      .from('post_upvotes')
      .select()
      .match({ user_id: user.id, post_id })
      .single()

    if (existing) {
      // Remove upvote
      await supabase.from('post_upvotes').delete().match({ user_id: user.id, post_id })
      await supabase.from('posts').update({ upvotes: supabase.rpc('decrement', { x: 1 }) }).eq('id', post_id)
      // Simple decrement
      const { data: post } = await supabase.from('posts').select('upvotes').eq('id', post_id).single()
      await supabase.from('posts').update({ upvotes: Math.max(0, (post?.upvotes || 1) - 1) }).eq('id', post_id)
      return NextResponse.json({ upvoted: false })
    } else {
      // Add upvote
      await supabase.from('post_upvotes').insert({ user_id: user.id, post_id })
      const { data: post } = await supabase.from('posts').select('upvotes').eq('id', post_id).single()
      await supabase.from('posts').update({ upvotes: (post?.upvotes || 0) + 1 }).eq('id', post_id)
      return NextResponse.json({ upvoted: true })
    }
  }

  if (action === 'add_recipe_comment') {
    const { recipe_id, commentBody } = body
    if (!commentBody?.trim()) return NextResponse.json({ error: 'Comment cannot be empty' }, { status: 400 })
    const { data, error } = await supabase
      .from('recipe_comments')
      .insert({ user_id: user.id, recipe_id, body: commentBody.trim() })
      .select('*, profiles(display_name, email)')
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ comment: data })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}
