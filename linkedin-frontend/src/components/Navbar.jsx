import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getUserSlug } from '../utils/userUtils';
import { Search, Home, Users, Compass, User, LogOut } from 'lucide-react';

export default function Navbar() {
  const { user, logout } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const q = params.get('q') || params.get('skill') || '';
    if (q) setSearchQuery(q);
  }, [location.search]);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const isActive = (path) => location.pathname === path;
  const userSlug = getUserSlug(user);

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-slate-200 shadow-sm">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
        {/* Left Side: Logo & Search */}
        <div className="flex items-center gap-3 flex-1 max-w-md">
          <Link to="/" className="flex-shrink-0 flex items-center gap-2 group">
            <div className="w-9 h-9 bg-gradient-to-tr from-[#0a66c2] to-indigo-600 rounded-lg flex items-center justify-center text-white font-black text-lg shadow-sm group-hover:scale-105 transition transform">
              CL
            </div>
            <span className="font-extrabold text-slate-900 tracking-tight text-lg hidden md:inline">
              Carrier<span className="text-[#0a66c2]">Link</span>
            </span>
          </Link>

          <form onSubmit={handleSearch} className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search..."
              className="w-full pl-9 pr-4 py-1.5 bg-slate-100 border border-transparent rounded-md text-sm text-slate-800 placeholder-slate-500 focus:outline-none focus:bg-white focus:border-[#0a66c2] focus:ring-1 focus:ring-[#0a66c2] transition"
            />
          </form>
        </div>

        {/* Right Side: Nav Items */}
        <nav className="flex items-center gap-1 sm:gap-6">
          <Link
            to="/"
            className={`flex flex-col items-center justify-center px-3 py-1 rounded-lg text-xs font-medium transition ${
              isActive('/')
                ? 'text-slate-900 border-b-2 border-slate-900'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <Home className="w-5 h-5 mb-0.5" />
            <span className="hidden sm:inline">Home</span>
          </Link>

          <Link
            to="/network"
            className={`flex flex-col items-center justify-center px-3 py-1 rounded-lg text-xs font-medium transition ${
              isActive('/network')
                ? 'text-slate-900 border-b-2 border-slate-900'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <Users className="w-5 h-5 mb-0.5" />
            <span className="hidden sm:inline">My Network</span>
          </Link>

          <Link
            to="/discover"
            className={`flex flex-col items-center justify-center px-3 py-1 rounded-lg text-xs font-medium transition ${
              isActive('/discover')
                ? 'text-slate-900 border-b-2 border-slate-900'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <Compass className="w-5 h-5 mb-0.5" />
            <span className="hidden sm:inline">Discover</span>
          </Link>

          <Link
            to={`/profile/${userSlug}`}
            state={{ userId: user?.id }}
            className={`flex flex-col items-center justify-center px-3 py-1 rounded-lg text-xs font-medium transition ${
              location.pathname.startsWith('/profile')
                ? 'text-slate-900 border-b-2 border-slate-900'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <User className="w-5 h-5 mb-0.5" />
            <span className="hidden sm:inline">Me</span>
          </Link>

          <div className="h-8 w-[1px] bg-slate-200 mx-1 hidden sm:block" />

          {/* User Profile / Logout */}
          <div className="flex items-center gap-3 pl-2">
            <button
              onClick={logout}
              title="Sign Out"
              className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-red-600 py-1.5 px-3 rounded-full hover:bg-red-50 transition cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </nav>
      </div>
    </header>
  );
}
