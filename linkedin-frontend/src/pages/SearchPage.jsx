import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import api from '../services/api';
import PostCard from '../components/PostCard';
import { getUserSlug } from '../utils/userUtils';
import { Search, Users, FileText, Code2, MapPin, ExternalLink } from 'lucide-react';

export default function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const skillParam = searchParams.get('skill') || '';

  const [activeTab, setActiveTab] = useState(skillParam ? 'skills' : 'people');
  const [searchInput, setSearchInput] = useState(query || skillParam || '');
  const [peopleResults, setPeopleResults] = useState([]);
  const [postResults, setPostResults] = useState([]);
  const [skillResults, setSkillResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const performSearch = async (searchTerm, tab) => {
    if (!searchTerm.trim()) return;
    setLoading(true);

    try {
      if (tab === 'people') {
        const res = await api.get(`/api/v1/search/people?q=${encodeURIComponent(searchTerm.trim())}`);
        setPeopleResults(res.data || []);
      } else if (tab === 'posts') {
        const res = await api.get(`/api/v1/search/posts?q=${encodeURIComponent(searchTerm.trim())}`);
        setPostResults(res.data || []);
      } else if (tab === 'skills') {
        const res = await api.get(`/api/v1/search/skills?skill=${encodeURIComponent(searchTerm.trim())}`);
        setSkillResults(res.data || []);
      }
    } catch (err) {
      console.error(`Failed to execute search on /api/v1/search/${tab}`, err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const term = query || skillParam;
    if (term) {
      setSearchInput(term);
      const tabToUse = skillParam ? 'skills' : activeTab;
      setActiveTab(tabToUse);
      performSearch(term, tabToUse);
    }
  }, [query, skillParam]);

  const handleTabChange = (newTab) => {
    setActiveTab(newTab);
    if (searchInput.trim()) {
      performSearch(searchInput.trim(), newTab);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (!searchInput.trim()) return;
    if (activeTab === 'skills') {
      setSearchParams({ skill: searchInput.trim() });
    } else {
      setSearchParams({ q: searchInput.trim() });
    }
    performSearch(searchInput.trim(), activeTab);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header & Tabs */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
        <div className="mb-4">
          <h1 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Search className="w-5 h-5 text-[#0a66c2]" />
            <span>Search Results for <span className="text-[#0a66c2]">"{searchInput || 'All'}"</span></span>
          </h1>
        </div>

        {/* Search Filter Tabs */}
        <div className="flex border-b border-slate-200 gap-6 text-sm font-semibold">
          <button
            onClick={() => handleTabChange('people')}
            className={`pb-3 flex items-center gap-2 transition cursor-pointer ${
              activeTab === 'people'
                ? 'text-[#0a66c2] border-b-2 border-[#0a66c2]'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>People ({peopleResults.length})</span>
          </button>

          <button
            onClick={() => handleTabChange('posts')}
            className={`pb-3 flex items-center gap-2 transition cursor-pointer ${
              activeTab === 'posts'
                ? 'text-[#0a66c2] border-b-2 border-[#0a66c2]'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Posts ({postResults.length})</span>
          </button>

          <button
            onClick={() => handleTabChange('skills')}
            className={`pb-3 flex items-center gap-2 transition cursor-pointer ${
              activeTab === 'skills'
                ? 'text-[#0a66c2] border-b-2 border-[#0a66c2]'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Code2 className="w-4 h-4" />
            <span>By Skill ({skillResults.length})</span>
          </button>
        </div>
      </div>

      {/* Results Container */}
      {loading ? (
        <div className="bg-white rounded-2xl p-8 border border-slate-200 text-center">
          <div className="w-8 h-8 border-4 border-[#0a66c2] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <p className="text-xs text-slate-500">Searching...</p>
        </div>
      ) : (
        <div>
          {/* People Tab Results */}
          {activeTab === 'people' && (
            <div className="space-y-3">
              {peopleResults.length === 0 ? (
                <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center text-slate-500 text-sm">
                  No people found matching "{searchInput}"
                </div>
              ) : (
                peopleResults.map((person) => {
                  const userSlug = getUserSlug(person) || person.id;
                  return (
                    <div
                      key={person.id}
                      className="bg-white p-4 rounded-2xl border border-slate-200 flex items-center justify-between gap-4 shadow-sm hover:shadow transition"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <Link to={`/profile/${userSlug}`} state={{ userId: person.id }}>
                          {person.profilePhotoUrl ? (
                            <img
                              src={person.profilePhotoUrl}
                              alt="Avatar"
                              className="w-12 h-12 rounded-full object-cover border border-slate-200"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-full bg-[#0a66c2] text-white font-bold text-lg flex items-center justify-center">
                              {person.firstName?.[0] || 'U'}
                            </div>
                          )}
                        </Link>

                        <div className="min-w-0">
                          <Link
                            to={`/profile/${userSlug}`}
                            state={{ userId: person.id }}
                            className="font-bold text-sm text-slate-900 hover:underline hover:text-[#0a66c2] truncate block"
                          >
                            {person.firstName} {person.lastName}
                          </Link>
                          <p className="text-xs text-slate-500 truncate">{person.headline || 'Member'}</p>
                          {person.location && (
                            <p className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                              <MapPin className="w-3 h-3" />
                              <span>{person.location}</span>
                            </p>
                          )}
                        </div>
                      </div>

                      <Link
                        to={`/profile/${userSlug}`}
                        state={{ userId: person.id }}
                        className="px-4 py-1.5 border border-[#0a66c2] text-[#0a66c2] hover:bg-[#0a66c2]/10 rounded-full text-xs font-semibold transition flex items-center gap-1 flex-shrink-0"
                      >
                        <span>View Profile</span>
                        <ExternalLink className="w-3 h-3" />
                      </Link>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* Posts Tab Results */}
          {activeTab === 'posts' && (
            <div className="space-y-4">
              {postResults.length === 0 ? (
                <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center text-slate-500 text-sm">
                  No posts found matching "{searchInput}"
                </div>
              ) : (
                postResults.map((post) => <PostCard key={post.id} post={post} />)
              )}
            </div>
          )}

          {/* Skills Tab Results */}
          {activeTab === 'skills' && (
            <div className="space-y-3">
              {skillResults.length === 0 ? (
                <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center text-slate-500 text-sm">
                  No users found with skill "{searchInput}"
                </div>
              ) : (
                skillResults.map((person) => {
                  const userSlug = getUserSlug(person) || person.id;
                  return (
                    <div
                      key={person.id}
                      className="bg-white p-4 rounded-2xl border border-slate-200 flex items-center justify-between gap-4 shadow-sm hover:shadow transition"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <Link to={`/profile/${userSlug}`} state={{ userId: person.id }}>
                          {person.profilePhotoUrl ? (
                            <img
                              src={person.profilePhotoUrl}
                              alt="Avatar"
                              className="w-12 h-12 rounded-full object-cover border border-slate-200"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-full bg-[#0a66c2] text-white font-bold text-lg flex items-center justify-center">
                              {person.firstName?.[0] || 'U'}
                            </div>
                          )}
                        </Link>

                        <div className="min-w-0">
                          <Link
                            to={`/profile/${userSlug}`}
                            state={{ userId: person.id }}
                            className="font-bold text-sm text-slate-900 hover:underline hover:text-[#0a66c2] truncate block"
                          >
                            {person.firstName} {person.lastName}
                          </Link>
                          <p className="text-xs text-slate-500 truncate">{person.headline || 'Member'}</p>
                          {person.skills && person.skills.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {person.skills.map((s, idx) => (
                                <span
                                  key={idx}
                                  className="px-2 py-0.5 bg-blue-50 text-[#0a66c2] rounded text-[10px] font-medium"
                                >
                                  {s}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      <Link
                        to={`/profile/${userSlug}`}
                        state={{ userId: person.id }}
                        className="px-4 py-1.5 border border-[#0a66c2] text-[#0a66c2] hover:bg-[#0a66c2]/10 rounded-full text-xs font-semibold transition flex items-center gap-1 flex-shrink-0"
                      >
                        <span>View Profile</span>
                        <ExternalLink className="w-3 h-3" />
                      </Link>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
