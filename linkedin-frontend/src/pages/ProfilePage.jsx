import React, { useState, useEffect } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { uploadAvatarViaPresignedUrl } from '../services/s3UploadService';
import EditProfileModal from '../components/EditProfileModal';
import ConnectionsModal from '../components/ConnectionsModal';
import PostCard from '../components/PostCard';
import { getUserSlug } from '../utils/userUtils';
import { Camera, Edit3, MapPin, UserPlus, Check, Clock, Mail, Briefcase, Award } from 'lucide-react';

export default function ProfilePage() {
  const { identifier } = useParams();
  const location = useLocation();
  const { user: currentUser } = useAuth();

  const [profile, setProfile] = useState(null);
  const [userPosts, setUserPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [connectMessage, setConnectMessage] = useState('');
  const [connectionStatus, setConnectionStatus] = useState('NOT_CONNECTED');
  const [profileConnections, setProfileConnections] = useState([]);
  const [isConnectionsModalOpen, setIsConnectionsModalOpen] = useState(false);

  const fetchProfileData = async () => {
    setLoading(true);

    try {
      let resolvedUserId = location.state?.userId;

      // If state doesn't have userId, attempt to resolve from identifier or currentUser
      if (!resolvedUserId) {
        if (!identifier) {
          resolvedUserId = currentUser?.id;
        } else if (currentUser?.id && (identifier === currentUser.id || identifier.toLowerCase() === getUserSlug(currentUser))) {
          resolvedUserId = currentUser.id;
        } else if (identifier.length > 25 && identifier.includes('-')) {
          // It's a raw UUID
          resolvedUserId = identifier;
        } else {
          // Fetch users list to resolve username slug -> userId
          const allUsersRes = await api.get('/api/v1/users');
          const matchedUser = (allUsersRes.data || []).find(
            u => getUserSlug(u) === identifier.toLowerCase() || u.id === identifier
          );
          if (matchedUser) {
            resolvedUserId = matchedUser.id;
          }
        }
      }

      if (!resolvedUserId) {
        setProfile(null);
        return;
      }

      // 1. Get User Profile: GET /api/v1/users/{resolvedUserId}
      const profileRes = await api.get(`/api/v1/users/${resolvedUserId}`);
      const profileData = profileRes.data;
      setProfile(profileData);

      // 2. Get User Posts: GET /api/v1/posts/user/{resolvedUserId}
      const postsRes = await api.get(`/api/v1/posts/user/${resolvedUserId}${user?.id ? `?currentUserId=${user.id}` : ''}`);
      setUserPosts(postsRes.data || []);

      // 3. Fetch Target User's Connections list for actual count & modal
      try {
        const targetConnRes = await api.get(`/api/v1/users/${resolvedUserId}/connections`);
        setProfileConnections(targetConnRes.data || []);
      } catch (connErr) {
        console.error('Failed to fetch profile connections', connErr);
      }

      // 3. Fetch Connection Status if not own profile
      if (currentUser?.id && profileData.id !== currentUser.id) {
        try {
          const statusRes = await api.get(
            `/api/v1/users/${profileData.id}/connection-status?currentUserId=${currentUser.id}`
          );
          if (statusRes.data?.status) {
            setConnectionStatus(statusRes.data.status);
          }
        } catch (connErr) {
          // Fallback to legacy check
          try {
            const connectionsRes = await api.get(`/api/v1/users/${currentUser.id}/connections`);
            const isConnected = (connectionsRes.data || []).some(u => u.id === profileData.id);

            if (isConnected) {
              setConnectionStatus('CONNECTED');
            } else {
              const pendingRes = await api.get(`/api/v1/users/${currentUser.id}/connections/pending`);
              const isPending = (pendingRes.data || []).some(
                c => c.requesterId === profileData.id || c.receiverId === profileData.id
              );
              setConnectionStatus(isPending ? 'PENDING' : 'NOT_CONNECTED');
            }
          } catch (legacyErr) {
            console.error('Failed to check connection status', legacyErr);
          }
        }
      }
    } catch (err) {
      console.error('Failed to load profile data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfileData();
  }, [identifier, location.state?.userId, currentUser?.id]);

  const targetUserId = profile?.id || location.state?.userId || currentUser?.id;
  const isOwnProfile = currentUser?.id === targetUserId;

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadingPhoto(true);
    try {
      // Direct S3 Pre-signed URL upload (with automatic backend fallback)
      const updatedUser = await uploadAvatarViaPresignedUrl(targetUserId, file);
      setProfile(updatedUser);
    } catch (err) {
      console.error('Failed to upload profile photo', err);
      alert(err.response?.data?.message || 'Failed to upload photo.');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleConnect = async () => {
    try {
      // Send Connection Request: POST /api/v1/users/{targetUserId}/connect
      const res = await api.post(`/api/v1/users/${targetUserId}/connect`);
      setConnectMessage(res.data || 'Connection request sent!');
      setConnectionStatus('PENDING');
    } catch (err) {
      console.error('Failed to send connection request', err);
      setConnectMessage(err.response?.data?.message || 'Request already sent or failed.');
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto py-12 text-center">
        <div className="w-10 h-10 border-4 border-[#0a66c2] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-sm text-slate-500">Loading profile...</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="max-w-4xl mx-auto py-12 text-center bg-white rounded-xl shadow-sm border border-slate-200 p-8">
        <h2 className="text-xl font-bold text-slate-800">User Not Found</h2>
        <p className="text-sm text-slate-500 mt-1">The profile you are looking for does not exist or has been removed.</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Top Header Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden relative">
        {/* Cover Photo */}
        <div className="h-44 bg-gradient-to-r from-[#0a66c2] via-sky-600 to-indigo-600 relative" />

        {/* Profile Info & Avatar */}
        <div className="px-8 pb-6 pt-0 relative">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 -mt-16 mb-4">
            {/* Avatar with Camera Icon */}
            <div className="relative group inline-block">
              {profile.profilePhotoUrl ? (
                <img
                  src={profile.profilePhotoUrl}
                  alt="Profile"
                  className="w-32 h-32 rounded-full border-4 border-white object-cover bg-white shadow-md"
                />
              ) : (
                <div className="w-32 h-32 rounded-full border-4 border-white bg-[#0a66c2] text-white font-bold text-4xl flex items-center justify-center shadow-md">
                  {profile.firstName?.[0] || 'U'}
                </div>
              )}

              {isOwnProfile && (
                <label className="absolute bottom-1 right-1 p-2 bg-slate-900/80 text-white rounded-full hover:bg-slate-900 transition cursor-pointer shadow-md">
                  <Camera className="w-4 h-4" />
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="hidden"
                    disabled={uploadingPhoto}
                  />
                </label>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3">
              {isOwnProfile ? (
                <button
                  onClick={() => setIsEditing(true)}
                  className="flex items-center gap-2 px-5 py-2 border border-[#0a66c2] text-[#0a66c2] hover:bg-[#0a66c2]/10 rounded-full font-semibold text-xs transition cursor-pointer"
                >
                  <Edit3 className="w-4 h-4" />
                  <span>Edit Profile</span>
                </button>
              ) : connectionStatus === 'CONNECTED' ? (
                <button
                  disabled
                  className="flex items-center gap-2 px-5 py-2 bg-emerald-600 text-white rounded-full font-semibold text-xs shadow cursor-default"
                >
                  <Check className="w-4 h-4" />
                  <span>Connected</span>
                </button>
              ) : connectionStatus === 'PENDING' ? (
                <button
                  disabled
                  className="flex items-center gap-2 px-5 py-2 bg-slate-200 text-slate-700 rounded-full font-semibold text-xs cursor-default"
                >
                  <Clock className="w-4 h-4" />
                  <span>Pending</span>
                </button>
              ) : (
                <button
                  onClick={handleConnect}
                  className="flex items-center gap-2 px-5 py-2 bg-[#0a66c2] hover:bg-[#004182] text-white rounded-full font-semibold text-xs shadow transition cursor-pointer"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Connect</span>
                </button>
              )}
            </div>
          </div>

          {connectMessage && (
            <div className="mb-3 text-xs bg-blue-50 text-[#0a66c2] p-2 rounded-lg border border-blue-200">
              {connectMessage}
            </div>
          )}

          {/* Name & Details */}
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              {profile.firstName} {profile.lastName}
            </h1>
            {profile.headline && (
              <p className="text-sm font-medium text-slate-700 mt-1">
                {profile.headline}
              </p>
            )}

            {profile.location && (
              <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" />
                <span>{profile.location}</span>
              </p>
            )}

            <p
              onClick={() => setIsConnectionsModalOpen(true)}
              className="text-xs text-[#0a66c2] font-semibold mt-2 hover:underline cursor-pointer inline-block"
            >
              {profileConnections.length} {profileConnections.length === 1 ? 'connection' : 'connections'}
            </p>
          </div>
        </div>
      </div>

      {/* About Card */}
      {profile.about && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <h2 className="text-lg font-bold text-slate-900 mb-3">About</h2>
          <p className="text-sm text-slate-700 whitespace-pre-line leading-relaxed">{profile.about}</p>
        </div>
      )}

      {/* Skills Card */}
      {profile.skills && profile.skills.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <h2 className="text-lg font-bold text-slate-900 mb-3 flex items-center gap-2">
            <Award className="w-5 h-5 text-[#0a66c2]" />
            <span>Skills</span>
          </h2>

          <div className="flex flex-wrap gap-2">
            {profile.skills.map((skill, index) => (
              <span
                key={index}
                className="px-3 py-1.5 bg-slate-100 text-slate-800 text-xs font-semibold rounded-full border border-slate-200 hover:bg-[#0a66c2]/10 hover:text-[#0a66c2] hover:border-[#0a66c2]/30 transition"
              >
                {skill}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* User Activity / Posts */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-slate-900 px-1">Activity & Posts</h2>
        {userPosts.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 text-center text-slate-500">
            <p className="text-sm">No posts published yet.</p>
          </div>
        ) : (
          userPosts.map(post => (
            <PostCard
              key={post.id}
              post={post}
              onDelete={(id) => setUserPosts(prev => prev.filter(p => p.id !== id))}
            />
          ))
        )}
      </div>

      {/* Edit Modal */}
      {isEditing && (
        <EditProfileModal
          profile={profile}
          onClose={() => setIsEditing(false)}
          onProfileUpdated={(updatedProfile) => setProfile(updatedProfile)}
        />
      )}

      {/* Connections Modal */}
      <ConnectionsModal
        isOpen={isConnectionsModalOpen}
        onClose={() => setIsConnectionsModalOpen(false)}
        connections={profileConnections}
        userName={profile ? `${profile.firstName} ${profile.lastName}` : 'User'}
      />
    </div>
  );
}
