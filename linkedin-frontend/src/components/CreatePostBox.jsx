import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { Image, X, Send } from 'lucide-react';

export default function CreatePostBox({ onPostCreated }) {
  const { user } = useAuth();
  const [content, setContent] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!content.trim() && !imageFile) return;

    setLoading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('authorId', user?.id || '');
      formData.append('content', content);
      if (imageFile) {
        formData.append('image', imageFile);
      }

      const response = await api.post('/api/v1/posts', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setContent('');
      removeImage();
      setIsExpanded(false);

      if (onPostCreated) {
        onPostCreated(response.data);
      }
    } catch (err) {
      console.error('Failed to create post', err);
      setError(err.response?.data?.message || 'Failed to publish post. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-4">
      {error && (
        <div className="mb-3 text-xs bg-red-50 text-red-600 border-l-2 border-red-500 p-2 rounded">
          {error}
        </div>
      )}

      <div className="flex items-start gap-3">
        {user?.profilePhotoUrl ? (
          <img
            src={user.profilePhotoUrl}
            alt="User Avatar"
            className="w-10 h-10 rounded-full object-cover border border-slate-200 flex-shrink-0"
          />
        ) : (
          <div className="w-10 h-10 rounded-full bg-[#0a66c2] text-white font-bold text-base flex items-center justify-center flex-shrink-0 shadow-sm">
            {user?.firstName?.[0] || 'U'}
          </div>
        )}

        <div className="flex-1">
          {!isExpanded ? (
            <button
              onClick={() => setIsExpanded(true)}
              className="w-full text-left px-4 py-2.5 bg-slate-100 hover:bg-slate-200/80 rounded-full text-slate-500 font-medium text-sm border border-slate-200/60 transition cursor-pointer"
            >
              Start a post...
            </button>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3">
              <textarea
                autoFocus
                rows={3}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="What do you want to talk about?"
                className="w-full p-3 border border-slate-300 rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0a66c2] focus:border-transparent resize-none"
              />

              {imagePreview && (
                <div className="relative rounded-lg overflow-hidden border border-slate-200 max-h-60 bg-slate-50 flex items-center justify-center">
                  <img src={imagePreview} alt="Preview" className="max-h-60 object-contain" />
                  <button
                    type="button"
                    onClick={removeImage}
                    className="absolute top-2 right-2 p-1 bg-slate-900/70 text-white rounded-full hover:bg-slate-900 transition"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer transition">
                    <Image className="w-4 h-4 text-emerald-600" />
                    <span>Media</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="hidden"
                    />
                  </label>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsExpanded(false);
                      removeImage();
                      setContent('');
                    }}
                    className="px-3 py-1.5 text-xs font-semibold text-slate-500 hover:bg-slate-100 rounded-full transition cursor-pointer"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={loading || (!content.trim() && !imageFile)}
                    className="flex items-center gap-1.5 px-4 py-1.5 bg-[#0a66c2] hover:bg-[#004182] text-white text-xs font-semibold rounded-full shadow transition disabled:opacity-40 cursor-pointer"
                  >
                    {loading ? (
                      <span>Posting...</span>
                    ) : (
                      <>
                        <span>Post</span>
                        <Send className="w-3.5 h-3.5" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
