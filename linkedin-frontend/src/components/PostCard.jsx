import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { getUserSlug } from '../utils/userUtils';
import { ThumbsUp, MessageSquare, Trash2, Send } from 'lucide-react';

export default function PostCard({ post, onDelete }) {
  const { user } = useAuth();
  const [author, setAuthor] = useState(null);
  const [liked, setLiked] = useState(Boolean(post.isLiked));
  const [likeCount, setLikeCount] = useState(post.likeCount || 0);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState('');
  const [commentCount, setCommentCount] = useState(post.commentCount || 0);
  const [submittingComment, setSubmittingComment] = useState(false);
  const [isLiking, setIsLiking] = useState(false);

  const [commentAuthorsMap, setCommentAuthorsMap] = useState({});

  useEffect(() => {
    if (typeof post.isLiked === 'boolean') {
      setLiked(post.isLiked);
    }
    setLikeCount(post.likeCount || 0);
    setCommentCount(post.commentCount || 0);
  }, [post.isLiked, post.likeCount, post.commentCount]);

  useEffect(() => {
    if (post.id && user?.id && post.isLiked === undefined) {
      api.get(`/api/v1/posts/${post.id}/liked?userId=${user.id}`)
        .then(res => {
          if (typeof res.data === 'boolean') {
            setLiked(res.data);
          }
        })
        .catch(() => {});
    }
  }, [post.id, user?.id, post.isLiked]);

  useEffect(() => {
    if (post.authorId) {
      api.get(`/api/v1/users/${post.authorId}`)
        .then(res => setAuthor(res.data))
        .catch(err => console.error('Failed to fetch post author', err));
    }
  }, [post.authorId]);

  const authorSlug = getUserSlug(author) || post.authorId;

  const fetchCommentAuthors = async (commentsList) => {
    const missingAuthorIds = [...new Set(commentsList.map(c => c.authorId))]
      .filter(id => id && !commentAuthorsMap[id]);

    if (missingAuthorIds.length === 0) return;

    const newAuthors = {};
    await Promise.all(
      missingAuthorIds.map(async (authorId) => {
        try {
          const res = await api.get(`/api/v1/users/${authorId}`);
          newAuthors[authorId] = res.data;
        } catch (e) {
          console.error('Failed to fetch comment author', e);
        }
      })
    );

    setCommentAuthorsMap(prev => ({ ...prev, ...newAuthors }));
  };

  const handleLike = async () => {
    if (!user?.id || isLiking) return;
    setIsLiking(true);
    try {
      const res = await api.post(`/api/v1/posts/${post.id}/like?userId=${user.id}`);
      const data = res.data;

      if (data && typeof data === 'object') {
        if (typeof data.liked === 'boolean') {
          setLiked(data.liked);
        }
        if (typeof data.likeCount === 'number') {
          setLikeCount(data.likeCount);
        }
      } else {
        const isUnliked = typeof data === 'string' && data.toLowerCase().includes('unliked');
        setLiked(!isUnliked);
        setLikeCount(prev => isUnliked ? Math.max(0, prev - 1) : prev + 1);
      }
    } catch (err) {
      console.error('Failed to like post', err);
    } finally {
      setIsLiking(false);
    }
  };

  const toggleComments = async () => {
    if (!showComments) {
      try {
        const res = await api.get(`/api/v1/posts/${post.id}/comments`);
        const commentsList = res.data || [];
        setComments(commentsList);
        setCommentCount(commentsList.length);
        fetchCommentAuthors(commentsList);
      } catch (err) {
        console.error('Failed to fetch comments', err);
      }
    }
    setShowComments(!showComments);
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;

    setSubmittingComment(true);
    try {
      const res = await api.post(
        `/api/v1/posts/${post.id}/comments?authorId=${user.id}&content=${encodeURIComponent(commentText.trim())}`
      );
      const newComment = res.data;
      setComments(prev => [...prev, newComment]);
      setCommentCount(prev => prev + 1);
      setCommentText('');
      if (user?.id) {
        setCommentAuthorsMap(prev => ({ ...prev, [user.id]: user }));
      }
    } catch (err) {
      console.error('Failed to add comment', err);
    } finally {
      setSubmittingComment(false);
    }
  };

  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleConfirmDelete = async () => {
    setIsDeleting(true);
    try {
      await api.delete(`/api/v1/posts/${post.id}?userId=${user.id}`);
      if (onDelete) onDelete(post.id);
    } catch (err) {
      console.error('Failed to delete post', err);
      alert(err.response?.data?.message || 'Failed to delete post.');
    } finally {
      setIsDeleting(false);
      setShowConfirmDelete(false);
    }
  };

  const isAuthor = user?.id === post.authorId;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 mb-4 overflow-hidden">
      {/* Post Header */}
      <div className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to={`/profile/${authorSlug}`} state={{ userId: post.authorId }}>
            {author?.profilePhotoUrl ? (
              <img
                src={author.profilePhotoUrl}
                alt="Author Avatar"
                className="w-10 h-10 rounded-full object-cover border border-slate-200"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-[#0a66c2] text-white font-bold text-sm flex items-center justify-center">
                {author?.firstName?.[0] || 'U'}
              </div>
            )}
          </Link>

          <div>
            <Link to={`/profile/${authorSlug}`} state={{ userId: post.authorId }} className="font-bold text-sm text-slate-900 hover:underline hover:text-[#0a66c2]">
              {author ? `${author.firstName} ${author.lastName}` : 'CarrierLink Member'}
            </Link>
            <p className="text-xs text-slate-500 line-clamp-1">{author?.headline || 'Member'}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">
              {post.createdAt ? new Date(post.createdAt).toLocaleDateString() : 'Recently'}
            </p>
          </div>
        </div>

        {isAuthor && (
          <div>
            {showConfirmDelete ? (
              <div className="flex items-center gap-2 bg-red-50 text-red-700 px-3 py-1.5 rounded-full border border-red-200 text-xs font-semibold shadow-sm">
                <span>Delete post?</span>
                <button
                  onClick={handleConfirmDelete}
                  disabled={isDeleting}
                  className="px-2.5 py-0.5 bg-red-600 hover:bg-red-700 text-white rounded-full transition cursor-pointer disabled:opacity-50"
                >
                  {isDeleting ? 'Deleting...' : 'Yes'}
                </button>
                <button
                  onClick={() => setShowConfirmDelete(false)}
                  disabled={isDeleting}
                  className="px-2.5 py-0.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-full transition cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowConfirmDelete(true)}
                title="Delete Post"
                className="text-slate-400 hover:text-red-600 p-1.5 rounded-full hover:bg-red-50 transition cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Post Content */}
      <div className="px-4 pb-3">
        <p className="text-sm text-slate-800 whitespace-pre-line leading-relaxed">{post.content}</p>
      </div>

      {/* Optional Post Image */}
      {post.imageUrl && (
        <div className="bg-slate-950 flex items-center justify-center max-h-96 overflow-hidden">
          <img src={post.imageUrl} alt="Post Attachment" className="w-full object-contain max-h-96" />
        </div>
      )}

      {/* Engagement Stats */}
      <div className="px-4 py-2 border-b border-slate-100 flex items-center justify-between text-xs text-slate-500">
        <div className="flex items-center gap-1">
          <span className="w-4 h-4 bg-[#0a66c2] text-white rounded-full flex items-center justify-center text-[9px]">
            👍
          </span>
          <span>{likeCount} likes</span>
        </div>

        <div className="flex items-center gap-3">
          <button onClick={toggleComments} className="hover:underline cursor-pointer">
            {commentCount} comments
          </button>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="px-2 py-1 flex items-center justify-around text-xs font-semibold text-slate-600 border-b border-slate-100">
        <button
          onClick={handleLike}
          className={`flex items-center gap-1.5 py-2 px-6 rounded-lg hover:bg-slate-100 transition cursor-pointer ${liked ? 'text-[#0a66c2] font-bold' : ''
            }`}
        >
          <ThumbsUp className={`w-4 h-4 ${liked ? 'fill-[#0a66c2] text-[#0a66c2]' : ''}`} />
          <span>Like</span>
        </button>

        <button
          onClick={toggleComments}
          className="flex items-center gap-1.5 py-2 px-6 rounded-lg hover:bg-slate-100 transition cursor-pointer"
        >
          <MessageSquare className="w-4 h-4" />
          <span>Comment</span>
        </button>
      </div>

      {/* Comments Section */}
      {showComments && (
        <div className="p-4 bg-slate-50 space-y-3">
          {/* Add Comment Input */}
          <form onSubmit={handleAddComment} className="flex gap-2">
            <input
              type="text"
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Add a comment..."
              className="flex-1 px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-full focus:outline-none focus:ring-1 focus:ring-[#0a66c2]"
            />
            <button
              type="submit"
              disabled={submittingComment || !commentText.trim()}
              className="px-3 py-1.5 bg-[#0a66c2] text-white rounded-full text-xs font-semibold hover:bg-[#004182] transition disabled:opacity-40 cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>

          {/* Comments List */}
          <div className="space-y-2 mt-2">
            {comments.map((comment) => {
              const commentAuthor = commentAuthorsMap[comment.authorId];
              const commentAuthorSlug = getUserSlug(commentAuthor) || comment.authorId;
              const authorName = commentAuthor
                ? `${commentAuthor.firstName} ${commentAuthor.lastName}`
                : 'CarrierLink Member';

              return (
                <div key={comment.id} className="bg-white p-2.5 rounded-lg border border-slate-200 text-xs">
                  <div className="flex justify-between items-center mb-1">
                    <div className="flex items-center gap-2">
                      <Link to={`/profile/${commentAuthorSlug}`} state={{ userId: comment.authorId }}>
                        {commentAuthor?.profilePhotoUrl ? (
                          <img
                            src={commentAuthor.profilePhotoUrl}
                            alt="Avatar"
                            className="w-6 h-6 rounded-full object-cover border border-slate-200"
                          />
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-[#0a66c2] text-white font-bold text-[10px] flex items-center justify-center">
                            {commentAuthor?.firstName?.[0] || 'U'}
                          </div>
                        )}
                      </Link>

                      <Link
                        to={`/profile/${commentAuthorSlug}`}
                        state={{ userId: comment.authorId }}
                        className="font-bold text-slate-900 hover:underline hover:text-[#0a66c2]"
                      >
                        {authorName}
                      </Link>
                    </div>

                    <span className="text-[10px] text-slate-400">
                      {comment.createdAt
                        ? new Date(comment.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                        : ''}
                    </span>
                  </div>
                  <p className="text-slate-700 pl-8">{comment.content}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
