import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from './firebase';

export const uploadFile = async (file: File | null, folder: string): Promise<string> => {
  if (!file) return '';
  const fileRef = ref(storage, `${folder}/${Date.now()}_${file.name}`);
  const snap = await uploadBytes(fileRef, file);
  const url = await getDownloadURL(snap.ref);
  return url;
};
