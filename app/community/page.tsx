'use client'
import { useState, useEffect, useCallback } from 'react'
import { MessageSquare, ThumbsUp, Plus, X, ChevronDown, ChevronUp, Send, Lightbulb, HelpCircle, Apple, AlertCircle } from 'lucide-react'
import Link from 'next/link'

interface Profile { display_name?: string; email?: string }
interface Comment { id: string; body: string; created_at: string; profiles: Profile }
interface Post {
  id: string; title: string; body: string; category: string
  upvotes: number; created_at: string; profiles: Profile
  comments: { count: number }[]
}

const CATEGORIES = [
  { id: 'all', label: 'All posts', icon: MessageSquare },
  { id: 'tip', label: 'Tips & tricks', icon: Lightbulb },
  { id: 'question', label: 'Questions', icon: HelpCircle },
  { id: 'freebie', label: 'Freebie finds', icon: Apple },
]

const CATEGORY_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  tip:      { bg: 'var(--green-50)',  color: 'var(--green-700)', label: 'Tip' },
  question: { bg: '#eff6ff',          color: '#1d4ed8',          label: 'Question' },
  freebie:  { bg: '#fffbeb',          color: '#92400e',          label: 'Freebie find' },
}

function timeAgo(date: string) {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000)
  if (seconds < 60) return 'just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  return `${Math.floor(seconds / 86400)}d ago`
}

function authorName(profile: Profile) {
  return profile?.display_name || profile?.email?.split('@')[0] || 'T1D family'
}

export default function CommunityPage() {
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [category, setCategory] = useState('all')
  const [showNewPost, setShowNewPost] = useState(false)
  const [expandedPost, setExpandedPost] = useState<string | null>(null)
  const [comments, setComments] = useState<Record<string, Comment[]>>({})
  const [newComment, setNewComment] = useState<Record<string, string>>({})
  const [commentLoading, setCommentLoading] = useState<string | null>(null)

  // New post form
  const [newTitle, setNewTitle] = useState('')
  const [newBody, setNewBody] = useState('')
  const [newCategory, setNewCategory] = useState<'tip' | 'question' | 'freebie'>('tip')
  const [postLoading, setPostLoading] = useState(false)
  const [postError, setPostError] = useState('')

  const fetchPosts = useCallback(async () => {
    setLoading(true)
    const res = await fetch(`/api/community${category !== 'all' ? `?category=${category}` : ''}`)
    const data = await res.json()
    setPosts(data.posts || [])
    setLoading(false)
  }, [category])

  useEffect(() => { fetchPosts() }, [fetchPosts])

  async function fetchComments(postId: string) {
    if (comments[postId]) return
    const res = await fetch(`/api/community?postId=${postId}`)
    const data = await res.json()
    setComments(p => ({ ...p, [postId]: data.comments || [] }))
  }

  function togglePost(postId: string) {
    if (expandedPost === postId) {
      setExpandedPost(null)
    } else {
      setExpandedPost(postId)
      fetchComments(postId)
    }
  }

  async function submitPost() {
    setPostError('')
    if (!newTitle.trim() || !newBody.trim()) { setPostError('Please fill in both fields'); return }
    setPostLoading(true)
    const res = await fetch('/api/community', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'create_post', title: newTitle, postBody: newBody, category: newCategory }),
    })
    const data = await res.json()
    if (data.error) {
      setPostError(data.error)
      setPostLoading(false)
      return
    }
    setNewTitle(''); setNewBody(''); setShowNewPost(false)
    setPostLoading(false)
    fetchPosts()
  }

  async function submitComment(postId: string) {
    const body = newComment[postId]?.trim()
    if (!body) return
    setCommentLoading(postId)
    const res = await fetch('/api/community', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'add_comment', post_id: postId, commentBody: body }),
    })
    const data = await res.json()
    if (data.comment) {
      setComments(p => ({ ...p, [postId]: [...(p[postId] || []), data.comment] }))
      setNewComment(p => ({ ...p, [postId]: '' }))
    }
    setCommentLoading(null)
  }

  async function upvote(postId: string) {
    const res = await fetch('/api/community', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'upvote', post_id: postId }),
    })
    if (res.ok) {
      setPosts(p => p.map(post =>
        post.id === postId
          ? { ...post, upvotes: post.upvotes + (res.status === 200 ? 1 : -1) }
          : post
      ))
      fetchPosts()
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 14px',
    border: '1px solid var(--border)', borderRadius: 8,
    fontSize: '0.95rem', fontFamily: 'var(--font-body)',
    background: 'var(--surface)', color: 'var(--ink)',
    outline: 'none', resize: 'vertical' as const,
  }

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '2rem 1rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.6rem, 5vw, 2.5rem)', color: 'var(--green-900)', marginBottom: '0.35rem' }}>
            Community
          </h1>
          <p style={{ color: 'var(--ink-muted)', fontSize: '0.95rem' }}>
            Share tips, ask questions, and learn from other T1D families.
          </p>
        </div>
        <button onClick={() => setShowNewPost(!showNewPost)} style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '10px 20px', background: 'var(--green-600)', color: '#fff',
          border: 'none', borderRadius: 10, cursor: 'pointer',
          fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: '0.9rem',
          whiteSpace: 'nowrap',
        }}>
          {showNewPost ? <X size={16} /> : <Plus size={16} />}
          {showNewPost ? 'Cancel' : 'New post'}
        </button>
      </div>

      {/* New post form */}
      {showNewPost && (
        <div className="card animate-fade-up" style={{ marginBottom: '1.5rem', background: 'var(--green-50)', border: '1px solid var(--green-200)' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', color: 'var(--green-800)', marginBottom: '1rem' }}>
            Share with the community
          </h2>

          {/* Category picker */}
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
            {(['tip', 'question', 'freebie'] as const).map(cat => (
              <button key={cat} onClick={() => setNewCategory(cat)} style={{
                padding: '6px 14px', borderRadius: 999, cursor: 'pointer',
                border: '1px solid', fontFamily: 'var(--font-body)', fontSize: '0.85rem',
                fontWeight: newCategory === cat ? 600 : 400,
                borderColor: newCategory === cat ? CATEGORY_STYLES[cat].color : 'var(--border)',
                background: newCategory === cat ? CATEGORY_STYLES[cat].bg : 'var(--surface)',
                color: newCategory === cat ? CATEGORY_STYLES[cat].color : 'var(--ink-muted)',
              }}>
                {CATEGORY_STYLES[cat].label}
              </button>
            ))}
          </div>

          <div style={{ marginBottom: '0.75rem' }}>
            <input type="text" placeholder="Title — keep it short and clear" value={newTitle}
              onChange={e => setNewTitle(e.target.value)} style={{ ...inputStyle, marginBottom: '0.75rem' }}
              onFocus={e => e.target.style.borderColor = 'var(--green-500)'}
              onBlur={e => e.target.style.borderColor = 'var(--border)'}
            />
            <textarea placeholder="Share the details… what worked, what didn't, your question, or your freebie find." value={newBody}
              onChange={e => setNewBody(e.target.value)} rows={4}
              style={inputStyle}
              onFocus={e => e.target.style.borderColor = 'var(--green-500)'}
              onBlur={e => e.target.style.borderColor = 'var(--border)'}
            />
          </div>

          {postError && (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '8px 12px', marginBottom: '0.75rem', color: '#b91c1c', fontSize: '0.85rem' }}>
              <AlertCircle size={15} /> {postError}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
            <button onClick={() => setShowNewPost(false)} style={{ padding: '9px 18px', border: '1px solid var(--border)', borderRadius: 8, background: 'var(--surface)', color: 'var(--ink-muted)', cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
              Cancel
            </button>
            <button onClick={submitPost} disabled={postLoading} style={{ padding: '9px 20px', background: 'var(--green-600)', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontFamily: 'var(--font-body)', fontWeight: 600 }}>
              {postLoading ? 'Posting…' : 'Post'}
            </button>
          </div>
        </div>
      )}

      {/* Category filter */}
      <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '1.5rem', overflowX: 'auto', paddingBottom: 4 }}>
        {CATEGORIES.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setCategory(id)} style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '7px 14px', borderRadius: 999, cursor: 'pointer', whiteSpace: 'nowrap',
            border: '1px solid', fontFamily: 'var(--font-body)', fontSize: '0.85rem',
            fontWeight: category === id ? 600 : 400,
            borderColor: category === id ? 'var(--green-500)' : 'var(--border)',
            background: category === id ? 'var(--green-50)' : 'var(--surface)',
            color: category === id ? 'var(--green-700)' : 'var(--ink-muted)',
          }}>
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      {/* Posts */}
      {loading ? (
        <div>
          {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 100, marginBottom: 12, borderRadius: 12 }} />)}
        </div>
      ) : posts.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--ink-muted)' }}>
          <MessageSquare size={36} color="var(--border)" style={{ marginBottom: '1rem' }} />
          <p style={{ fontWeight: 500, marginBottom: '0.5rem' }}>No posts yet in this category</p>
          <p style={{ fontSize: '0.875rem', marginBottom: '1.25rem' }}>Be the first to share!</p>
          <button onClick={() => setShowNewPost(true)} style={{ padding: '9px 20px', background: 'var(--green-600)', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontFamily: 'var(--font-body)', fontWeight: 600 }}>
            Write a post
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {posts.map(post => {
            const catStyle = CATEGORY_STYLES[post.category]
            const isExpanded = expandedPost === post.id
            const postComments = comments[post.id] || []

            return (
              <div key={post.id} className="card" style={{ padding: '1.25rem' }}>
                {/* Post header */}
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                  {/* Upvote */}
                  <button onClick={() => upvote(post.id)} style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
                    padding: '6px 10px', border: '1px solid var(--border)', borderRadius: 8,
                    background: 'var(--surface-2)', cursor: 'pointer', flexShrink: 0,
                    color: 'var(--ink-muted)',
                  }}>
                    <ThumbsUp size={14} />
                    <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>{post.upvotes}</span>
                  </button>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.35rem' }}>
                      <span style={{ fontSize: '0.72rem', fontWeight: 600, background: catStyle.bg, color: catStyle.color, padding: '2px 8px', borderRadius: 999 }}>
                        {catStyle.label}
                      </span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--ink-muted)' }}>
                        {authorName(post.profiles)} · {timeAgo(post.created_at)}
                      </span>
                    </div>
                    <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--green-900)', marginBottom: '0.35rem', lineHeight: 1.4 }}>
                      {post.title}
                    </h3>
                    <p style={{ fontSize: '0.875rem', color: 'var(--ink-muted)', lineHeight: 1.65,
                      display: isExpanded ? 'block' : '-webkit-box',
                      WebkitLineClamp: isExpanded ? 'unset' : 2,
                      WebkitBoxOrient: 'vertical' as const,
                      overflow: isExpanded ? 'visible' : 'hidden',
                    }}>
                      {post.body}
                    </p>

                    {/* Footer */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '0.75rem' }}>
                      <button onClick={() => togglePost(post.id)} style={{
                        display: 'flex', alignItems: 'center', gap: 5,
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: 'var(--ink-muted)', fontSize: '0.8rem', fontFamily: 'var(--font-body)', padding: 0,
                      }}>
                        <MessageSquare size={14} />
                        {(post.comments?.[0] as unknown as { count: number })?.count || 0} comments
                        {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Comments section */}
                {isExpanded && (
                  <div style={{ marginTop: '1rem', borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
                    {postComments.length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1rem' }}>
                        {postComments.map(comment => (
                          <div key={comment.id} style={{ display: 'flex', gap: '0.75rem' }}>
                            <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--green-100)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '0.7rem', fontWeight: 700, color: 'var(--green-700)' }}>
                              {authorName(comment.profiles)[0].toUpperCase()}
                            </div>
                            <div style={{ flex: 1 }}>
                              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'baseline', marginBottom: 2 }}>
                                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--green-800)' }}>{authorName(comment.profiles)}</span>
                                <span style={{ fontSize: '0.72rem', color: 'var(--ink-muted)' }}>{timeAgo(comment.created_at)}</span>
                              </div>
                              <p style={{ fontSize: '0.875rem', color: 'var(--ink-muted)', lineHeight: 1.6 }}>{comment.body}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p style={{ fontSize: '0.85rem', color: 'var(--ink-muted)', marginBottom: '1rem', fontStyle: 'italic' }}>No comments yet — be the first!</p>
                    )}

                    {/* Add comment */}
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <input type="text" placeholder="Add a comment…"
                        value={newComment[post.id] || ''}
                        onChange={e => setNewComment(p => ({ ...p, [post.id]: e.target.value }))}
                        onKeyDown={e => e.key === 'Enter' && submitComment(post.id)}
                        style={{ flex: 1, padding: '9px 12px', border: '1px solid var(--border)', borderRadius: 8, fontSize: '0.875rem', fontFamily: 'var(--font-body)', background: 'var(--surface)', color: 'var(--ink)', outline: 'none' }}
                        onFocus={e => e.target.style.borderColor = 'var(--green-500)'}
                        onBlur={e => e.target.style.borderColor = 'var(--border)'}
                      />
                      <button onClick={() => submitComment(post.id)} disabled={commentLoading === post.id}
                        style={{ padding: '9px 14px', background: 'var(--green-600)', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer' }}>
                        <Send size={15} />
                      </button>
                    </div>
                    <p style={{ fontSize: '0.72rem', color: 'var(--ink-muted)', marginTop: 4 }}>
                      <Link href="/auth/login" style={{ color: 'var(--green-600)', textDecoration: 'none' }}>Sign in</Link> to post or comment
                    </p>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
