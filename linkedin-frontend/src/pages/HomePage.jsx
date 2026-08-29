import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import SidebarProfileCard from '../components/SidebarProfileCard';
import CreatePostBox from '../components/CreatePostBox';
import PostCard from '../components/PostCard';
import { TrendingUp, Info, RefreshCw, Compass, Code2, Sparkles, ArrowRight } from 'lucide-react';

export default function HomePage() {
  const { user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const observerTarget = useRef(null);

  const fetchFeed = async (pageNum = 0) => {
    if (!user?.id) return;

    if (pageNum === 0) {
      setLoading(true);
      setHasMore(true);
    } else {
      setLoadingMore(true);
    }

    try {
      // 1. Fetch feed Post IDs from Feed Service: GET /api/v1/feed/{userId}?page={pageNum}&size=10
      const feedRes = await api.get(`/api/v1/feed/${user.id}?page=${pageNum}&size=10`);
      const postIds = feedRes.data || [];

      if (postIds.length < 10) {
        setHasMore(false);
      }

      if (postIds.length > 0) {
        // Fetch each post details
        const postPromises = postIds.map(id =>
          api.get(`/api/v1/posts/${id}`).then(res => res.data).catch(() => null)
        );
        const fetchedPosts = (await Promise.all(postPromises)).filter(Boolean);

        setPosts(prev => (pageNum === 0 ? fetchedPosts : [...prev, ...fetchedPosts]));
      } else if (pageNum === 0) {
        // Fallback: fetch user's own posts if feed is empty
        const userPostsRes = await api.get(`/api/v1/posts/user/${user.id}`);
        setPosts(userPostsRes.data || []);
        setHasMore(false);
      }
    } catch (err) {
      console.error('Failed to load feed page', pageNum, err);
      if (pageNum === 0) {
        try {
          const userPostsRes = await api.get(`/api/v1/posts/user/${user.id}`);
          setPosts(userPostsRes.data || []);
        } catch (fallbackErr) {
          console.error('Failed fallback post fetch', fallbackErr);
        }
        setHasMore(false);
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    setPage(0);
    fetchFeed(0);
  }, [user]);

  const loadMore = useCallback(() => {
    if (!loading && !loadingMore && hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchFeed(nextPage);
    }
  }, [loading, loadingMore, hasMore, page]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && hasMore && !loading && !loadingMore) {
          loadMore();
        }
      },
      { threshold: 0.5 }
    );

    const currentTarget = observerTarget.current;
    if (currentTarget) {
      observer.observe(currentTarget);
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget);
      }
    };
  }, [hasMore, loading, loadingMore, loadMore]);

  const handleRefresh = () => {
    setRefreshing(true);
    setPage(0);
    fetchFeed(0);
  };

  const handlePostCreated = (newPost) => {
    setPosts(prev => [newPost, ...prev]);
  };

  const handlePostDeleted = (deletedPostId) => {
    setPosts(prev => prev.filter(p => p.id !== deletedPostId));
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-12 gap-6">
      {/* Left Column - Sidebar Profile */}
      <div className="md:col-span-1 lg:col-span-3">
        <SidebarProfileCard />
      </div>

      {/* Middle Column - Main Feed */}
      <div className="md:col-span-3 lg:col-span-6">
        <CreatePostBox onPostCreated={handlePostCreated} />

        <div className="flex items-center justify-between mb-4 text-xs text-slate-500">
          <div className="h-[1px] bg-slate-200 flex-1" />
          <button
            onClick={handleRefresh}
            className="ml-3 p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-200/80 rounded-full transition cursor-pointer"
            title="Refresh Feed"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {loading ? (
          <div className="space-y-4">
            {[1, 2].map(i => (
              <div key={i} className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 animate-pulse">
                <div className="flex gap-3 items-center mb-4">
                  <div className="w-10 h-10 bg-slate-200 rounded-full" />
                  <div className="space-y-2 flex-1">
                    <div className="h-3 bg-slate-200 rounded w-1/3" />
                    <div className="h-2 bg-slate-200 rounded w-1/2" />
                  </div>
                </div>
                <div className="h-16 bg-slate-200 rounded mb-4" />
              </div>
            ))}
          </div>
        ) : posts.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center text-slate-500">
            <TrendingUp className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-800">No posts in your feed yet</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Share your thoughts or create a post above to get your professional feed started!
            </p>
          </div>
        ) : (
          <div>
            {posts.map((post, idx) => (
              <PostCard key={`${post.id}-${idx}`} post={post} onDelete={handlePostDeleted} />
            ))}

            {/* Infinite Scroll Observer Target & Spinner */}
            {hasMore && (
              <div ref={observerTarget} className="py-6 text-center">
                {loadingMore ? (
                  <div className="flex items-center justify-center gap-2 text-xs text-slate-500 font-medium">
                    <div className="w-5 h-5 border-2 border-[#0a66c2] border-t-transparent rounded-full animate-spin" />
                    <span>Loading more posts...</span>
                  </div>
                ) : null}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Right Column - Community & Discovery */}
      <div className="hidden lg:block lg:col-span-3 space-y-4">
        {/* Grow Network Widget */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <Compass className="w-4 h-4 text-[#0a66c2]" />
              <span>Grow Your Network</span>
            </h3>
          </div>
          <p className="text-xs text-slate-500 mb-3 leading-relaxed">
            Discover professionals, send connection requests, and expand your network.
          </p>
          <Link
            to="/discover"
            className="w-full py-2 bg-blue-50 text-[#0a66c2] hover:bg-[#0a66c2] hover:text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition"
          >
            <span>Discover People</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Popular Skills Search Widget */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
          <div className="flex items-center gap-1.5 mb-3">
            <Code2 className="w-4 h-4 text-emerald-600" />
            <h3 className="text-sm font-bold text-slate-900">Explore by Skills</h3>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {['Java', 'Spring Boot', 'React', 'Kafka', 'Microservices', 'SQL', 'Docker', 'AWS'].map((skill, idx) => (
              <Link
                key={idx}
                to={`/search?skill=${encodeURIComponent(skill)}`}
                className="px-2.5 py-1 bg-slate-100 text-slate-700 hover:bg-[#0a66c2]/10 hover:text-[#0a66c2] rounded-full text-xs font-medium transition"
              >
                {skill}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
