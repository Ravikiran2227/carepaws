import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { storage } from '../firebase/config';

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const ALLOWED_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'webp', 'gif']);

export function validateImageFile(file) {
  if (!file) return;
  if (!file.type.startsWith('image/')) {
    throw new Error('Please choose an image file.');
  }
  if (file.size > MAX_IMAGE_SIZE) {
    throw new Error('Image must be smaller than 5 MB.');
  }
}

export async function uploadImageFile(path, file) {
  validateImageFile(file);
  const imageRef = ref(storage, path);
  try {
    await uploadBytes(imageRef, file, {
      contentType: file.type,
    });
    return await getDownloadURL(imageRef);
  } catch (error) {
    if (error?.code?.startsWith('storage/')) {
      throw new Error('Image upload failed. Check Firebase Storage is enabled and the Storage rules are published.', { cause: error });
    }
    throw error;
  }
}

export function getImageExtension(file) {
  const extension = file?.name?.split('.').pop()?.toLowerCase();
  return ALLOWED_EXTENSIONS.has(extension) ? extension : 'jpg';
}
