import React, { useState, useEffect } from 'react';
import {
  Heart, MessageSquare, Flag, Pencil, Trash2, Plus, Send, MapPin,
  CheckCircle2, AlertCircle, Users, Save, X,
} from 'lucide-react';
import { communityApi } from '../services/apiClient';
import { getAqiCategory } from '../data/mockData';

const CATEGORIES = ['All', 'Pollution Report', 'Discussion', 'Awareness', 'Eco Challenge'];

export default function Community({ airQuality, authUser }) {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [filterCat, setFilterCat] = useState('All');

  // New Post form
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('Pollution Report');
  const [postLoc, setPostLoc] = useState(airQuality?.location || 'New Delhi, India');
  const [submitting, setSubmitting] = useState(false);

  // Edit state
  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');

  // Comments & Reports state
  const [openComments, setOpenComments] = useState({});
  const [commentInputs, setCommentInputs] = useState({});
  const [reportedNotice, setReportedNotice] = useState('');

  const cat = getAqiCategory(airQuality?.aqi ?? 0);

  const loadPosts = async (selectedCat = filterCat) => {
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await communityApi.listPosts(selectedCat);
      setPosts(res.posts || []);
    } catch (err) {
      setErrorMsg(err?.message || 'Unable to connect to community database.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPosts(filterCat);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterCat, authUser]);

  const handleCreatePost = async (e) => {
    e.preventDefault();
    if (title.trim().length < 3 || content.trim().length < 5) return;
    setSubmitting(true);
    setErrorMsg('');
    try {
      const res = await communityApi.createPost({
        title: title.trim(),
        content: content.trim(),
        category,
        location: postLoc.trim() || airQuality?.location || 'Local Area',
        authorName: authUser?.name || 'Community Member',
      });
      if (res?.post) {
        setPosts((prev) => [res.post, ...prev]);
        setTitle('');
        setContent('');
      }
    } catch (err) {
      setErrorMsg(err?.message || 'Failed to publish post.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleLike = async (postId) => {
    try {
      const res = await communityApi.toggleLike(postId);
      setPosts((prev) =>
        prev.map((p) => (p.id === postId ? { ...p, likedByMe: res.likedByMe, likesCount: res.likesCount } : p))
      );
    } catch {}
  };

  const handleSaveEdit = async (postId) => {
    try {
      const res = await communityApi.editPost(postId, { title: editTitle, content: editContent });
      setPosts((prev) =>
        prev.map((p) => (p.id === postId ? { ...p, title: res.title, content: res.content } : p))
      );
      setEditingId(null);
    } catch (err) {
      setErrorMsg(err?.message || 'Only the post author can edit this post.');
    }
  };

  const handleDeletePost = async (postId) => {
    try {
      await communityApi.deletePost(postId);
      setPosts((prev) => prev.filter((p) => p.id !== postId));
    } catch (err) {
      setErrorMsg(err?.message || 'Only the post author can delete this post.');
    }
  };

  const handleAddComment = async (postId, e) => {
    e.preventDefault();
    const txt = (commentInputs[postId] || '').trim();
    if (!txt) return;
    try {
      const res = await communityApi.addComment(postId, {
        content: txt,
        authorName: authUser?.name || 'Member',
      });
      if (res?.comment) {
        setPosts((prev) =>
          prev.map((p) => (p.id === postId ? { ...p, comments: [...(p.comments || []), res.comment] } : p))
        );
        setCommentInputs((c) => ({ ...c, [postId]: '' }));
      }
    } catch (err) {
      setErrorMsg(err?.message || 'Unable to post comment.');
    }
  };

  const handleReport = async (postId) => {
    try {
      await communityApi.reportPost(postId);
      setReportedNotice('Content flagged for moderation review.');
      setTimeout(() => setReportedNotice(''), 3000);
    } catch {}
  };

  return (
    <div className="space-y-5">
      {/* Header Banner */}
      <div className="surface-card p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold" style={{ color: 'var(--accent-teal)' }}>
            <MapPin size={13} />
            <span>
              {airQuality?.location || 'Global Community'} · Current AQI {airQuality?.aqi ?? 'N/A'} ({airQuality?.isLive ? cat.label : 'Offline'})
            </span>
          </div>
          <h2 className="text-lg font-bold mt-1" style={{ color: 'var(--text-primary)' }}>
            Community Clean-Air Discussions & Pollution Reports
          </h2>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
            Share real local observations, discuss air quality strategies, comment, and collaborate on clean-air challenges.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-semibold px-3.5 py-2 rounded-xl" style={{ background: 'var(--bg-subtle)', color: 'var(--text-secondary)' }}>
          <Users size={15} style={{ color: 'var(--accent-teal)' }} />
          <span>{posts.length} Active Discussions</span>
        </div>
      </div>

      {errorMsg && (
        <div className="p-3.5 rounded-xl text-xs flex items-center gap-2 bg-red-500/10 text-red-500 border border-red-500/25">
          <AlertCircle size={15} /> <span>{errorMsg}</span>
        </div>
      )}

      {reportedNotice && (
        <div className="p-3.5 rounded-xl text-xs flex items-center gap-2 bg-emerald-500/10 text-emerald-600 border border-emerald-500/25">
          <CheckCircle2 size={15} /> <span>{reportedNotice}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Create Post Composer */}
        <div className="lg:col-span-4">
          <form onSubmit={handleCreatePost} className="surface-card p-5 space-y-3.5 sticky top-20">
            <h3 className="font-bold text-base flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
              <Plus size={16} style={{ color: 'var(--accent-teal)' }} /> Create Community Post
            </h3>

            <div>
              <label className="text-xs font-semibold block mb-1" style={{ color: 'var(--text-secondary)' }}>Category</label>
              <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full px-3 py-2 text-xs saas-input">
                {CATEGORIES.filter((c) => c !== 'All').map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold block mb-1" style={{ color: 'var(--text-secondary)' }}>Location</label>
              <input
                value={postLoc}
                onChange={(e) => setPostLoc(e.target.value)}
                placeholder="City / Neighborhood"
                className="w-full px-3 py-2 text-xs saas-input"
              />
            </div>

            <div>
              <label className="text-xs font-semibold block mb-1" style={{ color: 'var(--text-secondary)' }}>Title</label>
              <input
                required
                minLength={3}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Concise headline (e.g., Smog spike near ring road)..."
                className="w-full px-3 py-2 text-xs saas-input"
              />
            </div>

            <div>
              <label className="text-xs font-semibold block mb-1" style={{ color: 'var(--text-secondary)' }}>Details</label>
              <textarea
                required
                minLength={5}
                rows={4}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Share observations, tips, or discussion questions..."
                className="w-full p-3 text-xs resize-none saas-input"
              />
            </div>

            <button type="submit" disabled={submitting} className="btn-brand w-full py-2.5 text-xs flex items-center justify-center gap-1.5">
              <Send size={13} /> {submitting ? 'Publishing...' : 'Publish Post'}
            </button>
          </form>
        </div>

        {/* Feed & Discussions */}
        <div className="lg:col-span-8 space-y-4">
          <div className="surface-card p-3 flex gap-2 overflow-x-auto">
            {CATEGORIES.map((c) => (
              <button
                key={c}
                onClick={() => setFilterCat(c)}
                className="px-3.5 py-1.5 rounded-xl text-xs font-semibold flex-shrink-0 transition-all"
                style={
                  filterCat === c
                    ? { background: 'linear-gradient(135deg, #0d9488, #0891b2)', color: '#fff' }
                    : { background: 'var(--bg-subtle)', color: 'var(--text-secondary)' }
                }
              >
                {c}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="space-y-3">
              <div className="surface-card p-5 h-36 skeleton" />
              <div className="surface-card p-5 h-36 skeleton" />
            </div>
          ) : posts.length === 0 ? (
            <div className="surface-card p-8 text-center text-xs" style={{ color: 'var(--text-muted)' }}>
              No posts in this category yet. Start the first discussion on the left!
            </div>
          ) : (
            posts.map((post) => {
              const commentsOpen = Boolean(openComments[post.id]);
              return (
                <div key={post.id} className="surface-card p-5 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-teal-500/12 text-teal-600">
                          {post.category}
                        </span>
                        <span className="text-xs font-medium flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
                          <MapPin size={11} /> {post.location}
                        </span>
                      </div>

                      {editingId === post.id ? (
                        <input
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          className="mt-2 px-3 py-1.5 text-sm font-bold w-full saas-input"
                        />
                      ) : (
                        <h4 className="text-base font-bold mt-2" style={{ color: 'var(--text-primary)' }}>
                          {post.title}
                        </h4>
                      )}
                      <div className="text-[11px] mt-0.5" style={{ color: 'var(--text-faint)' }}>
                        Posted by <strong>{post.authorName}</strong> · {new Date(post.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 flex-shrink-0">
                      {post.isOwner && editingId !== post.id && (
                        <>
                          <button
                            onClick={() => {
                              setEditingId(post.id);
                              setEditTitle(post.title);
                              setEditContent(post.content);
                            }}
                            title="Edit your post"
                            className="p-1.5 rounded-lg hover:bg-teal-500/10"
                            style={{ color: 'var(--text-muted)' }}
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            onClick={() => handleDeletePost(post.id)}
                            title="Delete your post"
                            className="p-1.5 rounded-lg hover:bg-red-500/10 text-red-500"
                          >
                            <Trash2 size={14} />
                          </button>
                        </>
                      )}
                      {!post.isOwner && (
                        <button
                          onClick={() => handleReport(post.id)}
                          title="Report inappropriate content"
                          className="p-1.5 rounded-lg hover:bg-amber-500/10"
                          style={{ color: 'var(--text-faint)' }}
                        >
                          <Flag size={13} />
                        </button>
                      )}
                    </div>
                  </div>

                  {editingId === post.id ? (
                    <div className="space-y-2">
                      <textarea
                        rows={3}
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        className="w-full p-2.5 text-xs saas-input"
                      />
                      <div className="flex gap-2">
                        <button onClick={() => handleSaveEdit(post.id)} className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-teal-600 text-white flex items-center gap-1">
                          <Save size={12} /> Save Changes
                        </button>
                        <button onClick={() => setEditingId(null)} className="px-3 py-1.5 rounded-lg text-xs" style={{ color: 'var(--text-muted)' }}>
                          <X size={13} /> Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs sm:text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                      {post.content}
                    </p>
                  )}

                  {/* Actions: Like + Comments */}
                  <div className="flex items-center gap-4 pt-2 border-t text-xs" style={{ borderColor: 'var(--border-subtle)' }}>
                    <button
                      onClick={() => handleLike(post.id)}
                      className="flex items-center gap-1.5 font-semibold transition-colors"
                      style={{ color: post.likedByMe ? '#ef4444' : 'var(--text-muted)' }}
                    >
                      <Heart size={14} fill={post.likedByMe ? '#ef4444' : 'none'} />
                      <span>{post.likesCount || 0}</span>
                    </button>

                    <button
                      onClick={() => setOpenComments((o) => ({ ...o, [post.id]: !o[post.id] }))}
                      className="flex items-center gap-1.5 font-semibold"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      <MessageSquare size={14} />
                      <span>{(post.comments || []).length} Comments</span>
                    </button>
                  </div>

                  {/* Comments Drawer */}
                  {commentsOpen && (
                    <div className="pt-2 space-y-2.5">
                      {(post.comments || []).map((c) => (
                        <div key={c.id} className="p-2.5 rounded-xl text-xs" style={{ background: 'var(--bg-subtle)' }}>
                          <div className="font-bold" style={{ color: 'var(--text-primary)' }}>{c.authorName}</div>
                          <div className="mt-0.5" style={{ color: 'var(--text-secondary)' }}>{c.content}</div>
                        </div>
                      ))}

                      <form onSubmit={(e) => handleAddComment(post.id, e)} className="flex gap-2">
                        <input
                          value={commentInputs[post.id] || ''}
                          onChange={(e) => setCommentInputs((prev) => ({ ...prev, [post.id]: e.target.value }))}
                          placeholder="Write a comment..."
                          className="flex-1 px-3 py-1.5 text-xs saas-input"
                        />
                        <button type="submit" className="btn-brand px-3 py-1.5 text-xs">
                          Reply
                        </button>
                      </form>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
