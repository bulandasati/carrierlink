import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { getUserSlug } from '../utils/userUtils';
import { Users, CheckCircle, UserPlus, ArrowRight } from 'lucide-react';

export default function NetworkPage() {
  const { user } = useAuth();
  const [pendingConnections, setPendingConnections] = useState([]);
  const [pendingUsersMap, setPendingUsersMap] = useState({});
  const [myConnections, setMyConnections] = useState([]);
  const [loadingPending, setLoadingPending] = useState(true);
  const [loadingConnections, setLoadingConnections] = useState(true);
  const [acceptingId, setAcceptingId] = useState(null);
  const [activeTab, setActiveTab] = useState('pending'); // 'pending' | 'my'

  const fetchPending = async () => {
    if (!user?.id) return;
    setLoadingPending(true);
    try {
      // 1. Get pending connection requests: GET /api/v1/users/{userId}/connections/pending
      const res = await api.get(`/api/v1/users/${user.id}/connections/pending`);
      const pendingList = res.data || [];
      setPendingConnections(pendingList);

      // Fetch user profile details for each requester
      const userMap = {};
      await Promise.all(
        pendingList.map(async (conn) => {
          try {
            const userRes = await api.get(`/api/v1/users/${conn.requesterId}`);
            userMap[conn.requesterId] = userRes.data;
          } catch (e) {
            console.error('Failed to fetch requester user', e);
          }
        })
      );
      setPendingUsersMap(userMap);
    } catch (err) {
      console.error('Failed to fetch pending connections', err);
    } finally {
      setLoadingPending(false);
    }
  };

  const fetchMyConnections = async () => {
    if (!user?.id) return;
    setLoadingConnections(true);
    try {
      // 2. Get accepted connections: GET /api/v1/users/{userId}/connections
      const res = await api.get(`/api/v1/users/${user.id}/connections`);
      setMyConnections(res.data || []);
    } catch (err) {
      console.error('Failed to fetch connections', err);
    } finally {
      setLoadingConnections(false);
    }
  };

  useEffect(() => {
    fetchPending();
    fetchMyConnections();
  }, [user]);

  const handleAccept = async (connectionId) => {
    setAcceptingId(connectionId);
    try {
      // Accept connection: PUT /api/v1/users/connection/{connectionId}/accept
      await api.put(`/api/v1/users/connection/${connectionId}/accept`);
      setPendingConnections(prev => prev.filter(c => c.id !== connectionId));
      fetchMyConnections();
    } catch (err) {
      console.error('Failed to accept connection', err);
      alert('Failed to accept connection.');
    } finally {
      setAcceptingId(null);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Top Header Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Users className="w-6 h-6 text-[#0a66c2]" />
            <span>Manage My Network</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Connect with professionals and accept pending connection invitations.
          </p>
        </div>

        <Link
          to="/discover"
          className="flex items-center gap-1.5 px-4 py-2 bg-[#0a66c2] hover:bg-[#004182] text-white text-xs font-semibold rounded-full shadow transition cursor-pointer"
        >
          <span>Discover People</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 bg-white rounded-xl p-1.5 border shadow-sm">
        <button
          onClick={() => setActiveTab('pending')}
          className={`flex-1 py-2.5 text-xs font-bold rounded-lg transition cursor-pointer flex items-center justify-center gap-2 ${
            activeTab === 'pending'
              ? 'bg-[#0a66c2] text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <span>Pending Invitations</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] ${
            activeTab === 'pending' ? 'bg-white text-[#0a66c2]' : 'bg-slate-200 text-slate-700'
          }`}>
            {pendingConnections.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('my')}
          className={`flex-1 py-2.5 text-xs font-bold rounded-lg transition cursor-pointer flex items-center justify-center gap-2 ${
            activeTab === 'my'
              ? 'bg-[#0a66c2] text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <span>My Connections</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] ${
            activeTab === 'my' ? 'bg-white text-[#0a66c2]' : 'bg-slate-200 text-slate-700'
          }`}>
            {myConnections.length}
          </span>
        </button>
      </div>

      {/* Pending Connections List */}
      {activeTab === 'pending' && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-4">
          <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3">
            Pending Invitations ({pendingConnections.length})
          </h2>

          {loadingPending ? (
            <div className="py-8 text-center text-slate-400 text-xs">
              <div className="w-8 h-8 border-3 border-[#0a66c2] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              Loading invitations...
            </div>
          ) : pendingConnections.length === 0 ? (
            <div className="py-12 text-center text-slate-500">
              <CheckCircle className="w-12 h-12 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-800">No pending invitations</p>
              <p className="text-xs text-slate-400 mt-0.5">When people invite you to connect, invitations will appear here.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {pendingConnections.map((conn) => {
                const requester = pendingUsersMap[conn.requesterId];
                const requesterSlug = getUserSlug(requester) || conn.requesterId;
                return (
                  <div key={conn.id} className="py-4 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <Link to={`/profile/${requesterSlug}`} state={{ userId: conn.requesterId }}>
                        {requester?.profilePhotoUrl ? (
                          <img
                            src={requester.profilePhotoUrl}
                            alt="Avatar"
                            className="w-12 h-12 rounded-full object-cover border border-slate-200"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-[#0a66c2] text-white font-bold text-base flex items-center justify-center">
                            {requester?.firstName?.[0] || 'U'}
                          </div>
                        )}
                      </Link>

                      <div>
                        <Link
                          to={`/profile/${requesterSlug}`}
                          state={{ userId: conn.requesterId }}
                          className="font-bold text-sm text-slate-900 hover:underline hover:text-[#0a66c2]"
                        >
                          {requester ? `${requester.firstName} ${requester.lastName}` : `User ${conn.requesterId.substring(0, 6)}`}
                        </Link>
                        <p className="text-xs text-slate-500 line-clamp-1">
                          {requester?.headline || 'Member'}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => handleAccept(conn.id)}
                      disabled={acceptingId === conn.id}
                      className="px-4 py-1.5 bg-[#0a66c2] hover:bg-[#004182] text-white font-semibold text-xs rounded-full shadow transition disabled:opacity-50 cursor-pointer flex-shrink-0"
                    >
                      {acceptingId === conn.id ? 'Accepting...' : 'Accept'}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* My Connections Grid */}
      {activeTab === 'my' && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-4">
          <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3">
            My Connections ({myConnections.length})
          </h2>

          {loadingConnections ? (
            <div className="py-8 text-center text-slate-400 text-xs">
              <div className="w-8 h-8 border-3 border-[#0a66c2] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              Loading connections...
            </div>
          ) : myConnections.length === 0 ? (
            <div className="py-12 text-center text-slate-500">
              <Users className="w-12 h-12 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-800">No connections yet</p>
              <p className="text-xs text-slate-400 mt-0.5">Explore the Discover tab to connect with other professionals!</p>
              <Link
                to="/discover"
                className="inline-block mt-4 px-4 py-2 bg-[#0a66c2] text-white text-xs font-semibold rounded-full shadow hover:bg-[#004182] transition"
              >
                Discover People
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {myConnections.map((connUser) => {
                const connSlug = getUserSlug(connUser) || connUser.id;
                return (
                  <div key={connUser.id} className="border border-slate-200 rounded-xl p-4 text-center hover:shadow-md transition bg-slate-50/50">
                    <Link to={`/profile/${connSlug}`} state={{ userId: connUser.id }} className="block mb-2">
                      {connUser.profilePhotoUrl ? (
                        <img
                          src={connUser.profilePhotoUrl}
                          alt="Avatar"
                          className="w-16 h-16 rounded-full object-cover mx-auto border-2 border-white shadow-sm hover:scale-105 transition"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-full bg-[#0a66c2] text-white font-bold text-xl flex items-center justify-center mx-auto shadow-sm hover:scale-105 transition">
                          {connUser.firstName?.[0] || 'U'}
                        </div>
                      )}
                    </Link>

                    <Link to={`/profile/${connSlug}`} state={{ userId: connUser.id }} className="block font-bold text-sm text-slate-900 hover:underline hover:text-[#0a66c2] line-clamp-1">
                      {connUser.firstName} {connUser.lastName}
                    </Link>

                    <p className="text-xs text-slate-500 line-clamp-2 mt-1 min-h-[32px]">
                      {connUser.headline || 'Member at CarrierLink'}
                    </p>

                    <Link
                      to={`/profile/${connSlug}`}
                      state={{ userId: connUser.id }}
                      className="mt-3 block w-full py-1.5 border border-[#0a66c2] text-[#0a66c2] hover:bg-[#0a66c2]/10 rounded-full font-semibold text-xs transition"
                    >
                      View Profile
                    </Link>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
