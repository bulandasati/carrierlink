import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { getUserSlug } from '../utils/userUtils';
import { Users, UserPlus, FileText, Award } from 'lucide-react';

export default function SidebarProfileCard() {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [connectionsCount, setConnectionsCount] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [postsCount, setPostsCount] = useState(0);

  useEffect(() => {
    if (user?.id) {
      // 1. Fetch Profile
      api.get(`/api/v1/users/${user.id}`)
        .then(res => setProfile(res.data))
        .catch(err => console.error('Failed to fetch profile', err));

      // 2. Fetch Connections Count
      api.get(`/api/v1/users/${user.id}/connections`)
        .then(res => setConnectionsCount((res.data || []).length))
        .catch(err => console.error('Failed to fetch connections count', err));

      // 3. Fetch Pending Invitations Count
      api.get(`/api/v1/users/${user.id}/connections/pending`)
        .then(res => setPendingCount((res.data || []).length))
        .catch(err => console.error('Failed to fetch pending count', err));

      // 4. Fetch User Posts Count
      api.get(`/api/v1/posts/user/${user.id}`)
        .then(res => setPostsCount((res.data || []).length))
        .catch(err => console.error('Failed to fetch posts count', err));
    }
  }, [user]);

  const displayUser = profile || user;
  const userSlug = getUserSlug(displayUser);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-4">
      {/* Cover Banner */}
      <div 
        className="h-16 bg-gradient-to-r from-[#0a66c2] via-sky-600 to-indigo-600 relative"
        style={displayUser?.coverPhotoUrl ? { backgroundImage: `url(${displayUser.coverPhotoUrl})`, backgroundSize: 'cover' } : {}}
      />

      {/* Avatar & Basic Info */}
      <div className="px-4 pb-4 pt-0 text-center relative">
        <Link to={`/profile/${userSlug}`} state={{ userId: displayUser?.id }} className="inline-block relative -mt-10 mb-2">
          {displayUser?.profilePhotoUrl ? (
            <img
              src={displayUser.profilePhotoUrl}
              alt="Avatar"
              className="w-16 h-16 rounded-full border-4 border-white object-cover mx-auto shadow-md hover:scale-105 transition transform"
            />
          ) : (
            <div className="w-16 h-16 rounded-full border-4 border-white bg-[#0a66c2] text-white font-bold text-xl flex items-center justify-center mx-auto shadow-md hover:scale-105 transition transform">
              {displayUser?.firstName?.[0] || 'U'}
            </div>
          )}
        </Link>

        <Link to={`/profile/${userSlug}`} state={{ userId: displayUser?.id }} className="block hover:underline">
          <h2 className="text-base font-bold text-slate-900 leading-snug">
            {displayUser?.firstName || 'User'} {displayUser?.lastName || ''}
          </h2>
        </Link>

        {displayUser?.headline && (
          <p className="text-xs text-slate-500 mt-1 line-clamp-2">
            {displayUser.headline}
          </p>
        )}

        {displayUser?.location && (
          <p className="text-xs text-slate-400 mt-0.5">{displayUser.location}</p>
        )}
      </div>

      {/* Live Stats */}
      <div className="border-t border-slate-100 px-4 py-3 text-xs text-slate-600 space-y-2.5">
        <Link
          to="/network"
          className="flex justify-between items-center hover:bg-slate-50 p-1.5 rounded transition cursor-pointer group"
        >
          <span className="text-slate-500 group-hover:text-slate-900 flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-[#0a66c2]" />
            <span>Connections</span>
          </span>
          <span className="font-bold text-[#0a66c2]">{connectionsCount}</span>
        </Link>

        <Link
          to="/network"
          className="flex justify-between items-center hover:bg-slate-50 p-1.5 rounded transition cursor-pointer group"
        >
          <span className="text-slate-500 group-hover:text-slate-900 flex items-center gap-1.5">
            <UserPlus className="w-3.5 h-3.5 text-amber-600" />
            <span>Pending Requests</span>
          </span>
          <span className={`font-bold ${pendingCount > 0 ? 'text-amber-600' : 'text-slate-400'}`}>
            {pendingCount}
          </span>
        </Link>

        <Link
          to={`/profile/${userSlug}`}
          state={{ userId: displayUser?.id }}
          className="flex justify-between items-center hover:bg-slate-50 p-1.5 rounded transition cursor-pointer group"
        >
          <span className="text-slate-500 group-hover:text-slate-900 flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-emerald-600" />
            <span>My Posts</span>
          </span>
          <span className="font-bold text-emerald-600">{postsCount}</span>
        </Link>
      </div>

      {/* Skills Pill Tags if present */}
      {displayUser?.skills && displayUser.skills.length > 0 && (
        <div className="border-t border-slate-100 px-4 py-3 text-xs">
          <div className="flex items-center gap-1 text-slate-500 font-semibold mb-2">
            <Award className="w-3.5 h-3.5 text-[#0a66c2]" />
            <span>My Top Skills</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {displayUser.skills.slice(0, 4).map((skill, index) => (
              <Link
                key={index}
                to={`/search?skill=${encodeURIComponent(skill)}`}
                className="px-2 py-0.5 bg-slate-100 text-slate-700 hover:bg-[#0a66c2]/10 hover:text-[#0a66c2] rounded-full text-[10px] font-medium transition"
              >
                {skill}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
