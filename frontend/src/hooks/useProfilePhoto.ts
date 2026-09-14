import { useState, useEffect } from 'react';

export function useProfilePhoto() {
  const [profilePhoto, setProfilePhoto] = useState<string | null>(() => {
    try {
      return localStorage.getItem('user_profile_photo');
    } catch (e) {
      return null;
    }
  });

  useEffect(() => {
    const handlePhotoSync = () => {
      try {
        setProfilePhoto(localStorage.getItem('user_profile_photo'));
      } catch (e) {}
    };

    window.addEventListener('profile_photo_updated', handlePhotoSync);
    window.addEventListener('storage', handlePhotoSync);
    return () => {
      window.removeEventListener('profile_photo_updated', handlePhotoSync);
      window.removeEventListener('storage', handlePhotoSync);
    };
  }, []);

  const savePhoto = (dataUrl: string) => {
    try {
      localStorage.setItem('user_profile_photo', dataUrl);
      setProfilePhoto(dataUrl);
      window.dispatchEvent(new Event('profile_photo_updated'));
      window.dispatchEvent(new Event('storage'));
    } catch (e) {
      console.error('Failed to save profile photo:', e);
    }
  };

  const removePhoto = () => {
    try {
      localStorage.removeItem('user_profile_photo');
      setProfilePhoto(null);
      window.dispatchEvent(new Event('profile_photo_updated'));
      window.dispatchEvent(new Event('storage'));
    } catch (e) {
      console.error('Failed to remove profile photo:', e);
    }
  };

  return { profilePhoto, savePhoto, removePhoto };
}
