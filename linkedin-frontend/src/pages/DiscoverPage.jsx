import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { getUserSlug } from '../utils/userUtils';
import { Compass, UserPlus, Check, MapPin, Award } from 'lucide-react';

export default function DiscoverPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sentRequests, setSentRequests] = useState({});

  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true);
      try {
        // Fetch all users: GET /api/v1/users
        const res = await api.get('/api/v1/users');
        setUsers(res.data || []);
      } catch (err) {
        console.error('Failed to fetch users for discover', err);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  const handleConnect = async (targetUserId) => {
    try {
      // Send connection request: POST /api/v1/users/{targetUserId}/connect
      await api.post(`/api/v1/users/${targetUserId}/connect`);
      setSentRequests(prev => ({ ...prev, [targetUserId]: true }));
    } catch (err) {
      console.error('Failed to send connection request', err);
      alert(err.response?.data?.message || 'Request already sent or failed.');
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Compass className="w-6 h-6 text-[#0a66c2]" />
            <span>Discover Professionals</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Browse and connect with people across your network and industry.
          </p>
        </div>
      </div>

      {/* Users Grid */}
      {loading ? (
        <div className="py-12 text-center text-slate-500">
          <div className="w-10 h-10 border-4 border-[#0a66c2] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs text-slate-500">Loading professionals...</p>
        </div>
      ) : users.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 text-center text-slate-500">
          <Compass className="w-12 h-12 text-slate-300 mx-auto mb-2" />
          <h3 className="text-base font-bold text-slate-800">No other users found</h3>
          <p className="text-xs text-slate-500 mt-1">Register another account in an incognito window to test connecting!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {users.map((profile) => {
            const userSlug = getUserSlug(profile) || profile.id;
            return (
              <div
                key={profile.id}
                className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition flex flex-col justify-between"
              >
                <div>
                  {/* Banner */}
                  <div className="h-16 bg-gradient-to-r from-[#0a66c2] to-sky-600 relative" />

                  {/* Avatar & Info */}
                  <div className="px-4 pb-4 pt-0 text-center relative -mt-10">
                    <Link to={`/profile/${userSlug}`} state={{ userId: profile.id }}>
                      {profile.profilePhotoUrl ? (
                        <img
                          src={profile.profilePhotoUrl}
                          alt="Avatar"
                          className="w-20 h-20 rounded-full border-4 border-white object-cover mx-auto shadow-md hover:scale-105 transition transform"
                        />
                      ) : (
                        <div className="w-20 h-20 rounded-full border-4 border-white bg-[#0a66c2] text-white font-bold text-2xl flex items-center justify-center mx-auto shadow-md hover:scale-105 transition transform">
                          {profile.firstName?.[0] || 'U'}
                        </div>
                      )}
                    </Link>

                    <Link to={`/profile/${userSlug}`} state={{ userId: profile.id }} className="block mt-2 hover:underline">
                      <h3 className="text-base font-bold text-slate-900 leading-snug line-clamp-1">
                        {profile.firstName} {profile.lastName}
                      </h3>
                    </Link>

                    {profile.headline && (
                      <p className="text-xs text-slate-500 mt-1 line-clamp-2 min-h-[32px]">
                        {profile.headline}
                      </p>
                    )}

                    {profile.location && (
                      <p className="text-[11px] text-slate-400 mt-1 flex items-center justify-center gap-1">
                        <MapPin className="w-3 h-3" />
                        <span>{profile.location}</span>
                      </p>
                    )}

                    {/* Skills badges preview */}
                    {profile.skills && profile.skills.length > 0 && (
                      <div className="flex flex-wrap items-center justify-center gap-1 mt-3">
                        {profile.skills.slice(0, 3).map((skill, i) => (
                          <span key={i} className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[10px] rounded-full font-medium border border-slate-200">
                            {skill}
                          </span>
                        ))}
                        {profile.skills.length > 3 && (
                          <span className="text-[10px] text-slate-400 font-medium">+{profile.skills.length - 3}</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Action Footer */}
                <div className="p-4 border-t border-slate-100 flex gap-2">
                  <Link
                    to={`/profile/${userSlug}`}
                    state={{ userId: profile.id }}
                    className="flex-1 py-1.5 border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-full text-xs font-semibold text-center transition"
                  >
                    View
                  </Link>

                <button
                  onClick={() => handleConnect(profile.id)}
                  disabled={sentRequests[profile.id]}
                  className={`flex-1 py-1.5 rounded-full text-xs font-semibold flex items-center justify-center gap-1 transition shadow-sm cursor-pointer ${
                    sentRequests[profile.id]
                      ? 'bg-emerald-600 text-white cursor-default'
                      : 'bg-[#0a66c2] hover:bg-[#004182] text-white'
                  }`}
                >
                  {sentRequests[profile.id] ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Pending</span>
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>Connect</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}
        </div>
      )}
    </div>
  );
}
