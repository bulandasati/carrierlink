import api from './api';

const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB minimum per part for AWS S3 Multipart Upload

/**
 * Upload Avatar using S3 Pre-signed URL with graceful fallback.
 * 1. Obtains Pre-signed PUT URL from user-service
 * 2. Uploads binary directly to S3 (bypassing backend server)
 * 3. Confirms new avatar URL in database & publishes Kafka update
 */
export async function uploadAvatarViaPresignedUrl(userId, file) {
  try {
    const params = new URLSearchParams({
      fileName: file.name || 'avatar.jpg',
      contentType: file.type || 'image/jpeg',
    });

    const presignedRes = await api.get(`/api/v1/users/${userId}/avatar/presigned-url?${params.toString()}`);
    const { uploadUrl, fileUrl } = presignedRes.data;

    // Direct binary PUT to S3
    await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': file.type || 'image/jpeg',
      },
      body: file,
    });

    // Confirm with backend to update profile in PostgreSQL
    const confirmRes = await api.put(`/api/v1/users/${userId}/avatar/confirm`, {
      photoUrl: fileUrl,
    });

    return confirmRes.data;
  } catch (error) {
    console.warn('Direct S3 presigned avatar upload encountered an issue, using backend fallback:', error);
    // Fallback to legacy multipart endpoint
    const formData = new FormData();
    formData.append('file', file);
    const fallbackRes = await api.post(`/api/v1/users/${userId}/profile-photo`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return fallbackRes.data;
  }
}

/**
 * Upload Post Attachment to S3:
 * - If file size >= 5MB: Uses S3 Multipart Upload (initiate -> presigned part URLs -> upload in chunks -> complete).
 * - If file size < 5MB: Uses Single-part Pre-signed PUT URL.
 * Returns the public fileUrl if successful, or null if fallback to FormData is needed.
 */
export async function uploadPostAttachmentViaS3(userId, file, onProgress) {
  try {
    if (file.size >= CHUNK_SIZE) {
      return await uploadViaMultipart(userId, file, onProgress);
    } else {
      return await uploadViaSinglePresigned(userId, file, onProgress);
    }
  } catch (err) {
    console.warn('Direct S3 upload error, falling back to server multipart/form-data:', err);
    return null; // Signals caller to proceed with standard backend FormData
  }
}

/**
 * Single-part Pre-signed PUT upload for files < 5MB
 */
async function uploadViaSinglePresigned(userId, file, onProgress) {
  const params = new URLSearchParams({
    authorId: userId,
    fileName: file.name,
    contentType: file.type || 'application/octet-stream',
  });

  const res = await api.post(`/api/v1/posts/upload/presigned-url?${params.toString()}`);
  const { uploadUrl, fileUrl } = res.data;

  const putRes = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': file.type || 'application/octet-stream',
    },
    body: file,
  });

  if (!putRes.ok) {
    throw new Error(`S3 PUT failed with status: ${putRes.status}`);
  }

  if (onProgress) onProgress(100);
  return fileUrl;
}

/**
 * S3 Multipart Upload for files >= 5MB
 * 1. Initiate -> uploadId
 * 2. Upload chunks in parallel / sequential with presigned part URLs
 * 3. Complete -> stitch parts into final S3 object
 */
async function uploadViaMultipart(userId, file, onProgress) {
  const params = new URLSearchParams({
    authorId: userId,
    fileName: file.name,
    contentType: file.type || 'application/octet-stream',
  });

  // Step 1: Initiate Multipart Upload
  const initRes = await api.post(`/api/v1/posts/upload/multipart/initiate?${params.toString()}`);
  const { uploadId, key } = initRes.data;

  const totalParts = Math.ceil(file.size / CHUNK_SIZE);
  const completedParts = [];

  try {
    // Step 2: Upload each part
    for (let partNumber = 1; partNumber <= totalParts; partNumber++) {
      const start = (partNumber - 1) * CHUNK_SIZE;
      const end = Math.min(start + CHUNK_SIZE, file.size);
      const chunk = file.slice(start, end);

      const partPresignRes = await api.post(
        `/api/v1/posts/upload/multipart/presigned-part?key=${encodeURIComponent(key)}&uploadId=${encodeURIComponent(uploadId)}&partNumber=${partNumber}`
      );
      const { uploadUrl } = partPresignRes.data;

      const partPutRes = await fetch(uploadUrl, {
        method: 'PUT',
        body: chunk,
      });

      if (!partPutRes.ok) {
        throw new Error(`Part ${partNumber} upload failed with status ${partPutRes.status}`);
      }

      // S3 returns ETag header enclosed in quotes
      let eTag = partPutRes.headers.get('ETag') || partPutRes.headers.get('etag');
      if (eTag) {
        eTag = eTag.replace(/^"|"$/g, '');
      }

      completedParts.push({
        partNumber,
        eTag: eTag || `dummy-etag-${partNumber}`,
      });

      if (onProgress) {
        onProgress(Math.round((partNumber / totalParts) * 100));
      }
    }

    // Step 3: Complete Multipart Upload
    const completeRes = await api.post('/api/v1/posts/upload/multipart/complete', {
      key,
      uploadId,
      parts: completedParts,
    });

    return completeRes.data.fileUrl;
  } catch (err) {
    // Abort if failure occurs during part upload
    await api.post(`/api/v1/posts/upload/multipart/abort?key=${encodeURIComponent(key)}&uploadId=${encodeURIComponent(uploadId)}`).catch(() => {});
    throw err;
  }
}
