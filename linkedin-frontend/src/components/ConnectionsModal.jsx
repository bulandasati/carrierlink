import React from 'react';
import { Link } from 'react-router-dom';
import { X, MapPin, Users } from 'lucide-react';
import { getUserSlug } from '../utils/userUtils';

export default function ConnectionsModal({ isOpen, onClose, connections = [], userName = 'User' }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-[#0a66c2]" />
            <h2 className="text-base font-bold text-slate-900">
              {userName}'s Connections ({connections.length})
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-full transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content List */}
        <div className="p-6 max-h-[60vh] overflow-y-auto space-y-3">
          {connections.length === 0 ? (
            <div className="py-8 text-center text-slate-500 text-xs">
              No connections to display.
            </div>
          ) : (
            connections.map((connUser) => {
              const connSlug = getUserSlug(connUser) || connUser.id;
              return (
                <div
                  key={connUser.id}
                  className="p-3 border border-slate-100 rounded-xl flex items-center justify-between gap-3 hover:bg-slate-50 transition"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Link
                      to={`/profile/${connSlug}`}
                      state={{ userId: connUser.id }}
                      onClick={onClose}
                      className="flex-shrink-0"
                    >
                      {connUser.profilePhotoUrl ? (
                        <img
                          src={connUser.profilePhotoUrl}
                          alt="Avatar"
                          className="w-11 h-11 rounded-full object-cover border border-slate-200 shadow-sm hover:scale-105 transition"
                        />
                      ) : (
                        <div className="w-11 h-11 rounded-full bg-[#0a66c2] text-white font-bold text-base flex items-center justify-center shadow-sm hover:scale-105 transition">
                          {connUser.firstName?.[0] || 'U'}
                        </div>
                      )}
                    </Link>

                    <div className="min-w-0">
                      <Link
                        to={`/profile/${connSlug}`}
                        state={{ userId: connUser.id }}
                        onClick={onClose}
                        className="font-bold text-sm text-slate-900 hover:underline hover:text-[#0a66c2] truncate block"
                      >
                        {connUser.firstName} {connUser.lastName}
                      </Link>
                      <p className="text-xs text-slate-500 truncate">
                        {connUser.headline || 'Member at CarrierLink'}
                      </p>
                      {connUser.location && (
                        <p className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3" />
                          <span>{connUser.location}</span>
                        </p>
                      )}
                    </div>
                  </div>

                  <Link
                    to={`/profile/${connSlug}`}
                    state={{ userId: connUser.id }}
                    onClick={onClose}
                    className="px-3 py-1.5 border border-[#0a66c2] text-[#0a66c2] hover:bg-[#0a66c2]/10 rounded-full font-semibold text-xs transition flex-shrink-0"
                  >
                    View
                  </Link>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
