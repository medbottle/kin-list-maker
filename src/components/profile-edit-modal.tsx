"use client";

import { useState, useRef, useEffect } from "react";
import { createClient } from "@/lib/supabase-client";
import Image from "next/image";

interface ProfileEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentDisplayName: string | null;
  currentGender: string | null;
  currentProfilePicture: string | null;
  onUpdate: () => void;
}

export function ProfileEditModal({
  isOpen,
  onClose,
  currentDisplayName,
  currentGender,
  currentProfilePicture,
  onUpdate,
}: ProfileEditModalProps) {
  const [displayName, setDisplayName] = useState(currentDisplayName || "");
  const [gender, setGender] = useState(currentGender || "");
  const [profilePicture, setProfilePicture] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentProfilePicture);
  const [removePicture, setRemovePicture] = useState(false);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  useEffect(() => {
    if (isOpen) {
      setDisplayName(currentDisplayName || "");
      setGender(currentGender || "");
      setPreviewUrl(currentProfilePicture);
      setProfilePicture(null);
      setRemovePicture(false);
    }
  }, [isOpen, currentDisplayName, currentGender, currentProfilePicture]);

  if (!isOpen) return null;

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      setProfilePicture(file);
      setRemovePicture(false);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      let profilePictureUrl = currentProfilePicture;

      if (removePicture && !profilePicture && currentProfilePicture) {
        try {
          const urlParts = currentProfilePicture.split("/");
          const fileName = urlParts[urlParts.length - 1];
          const filePath = `profile-pictures/${fileName}`;
          
          await supabase.storage.from("avatars").remove([filePath]);
        } catch (error) {
          console.error("Error deleting old picture:", error);
        }
        profilePictureUrl = null;
      }

      if (profilePicture) {
        const fileExt = profilePicture.name.split(".").pop();
        const fileName = `${user.id}-${Date.now()}.${fileExt}`;
        const filePath = `profile-pictures/${fileName}`;

        const { error: uploadError, data: uploadData } = await supabase.storage
          .from("avatars")
          .upload(filePath, profilePicture, {
            cacheControl: "3600",
            upsert: true,
          });

        if (uploadError) {
          console.error("Upload error:", uploadError);
          alert(`Failed to upload image: ${uploadError.message}`);
          setLoading(false);
          return;
        }

        const {
          data: { publicUrl },
        } = supabase.storage.from("avatars").getPublicUrl(filePath);
        profilePictureUrl = publicUrl;
      }

      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser();

      const updatedMetadata = {
        ...(currentUser?.user_metadata || {}),
        display_name: displayName || null,
        gender: gender || null,
        profile_picture: profilePictureUrl || null,
      };

      const { error } = await supabase.auth.updateUser({
        data: updatedMetadata,
      });

      if (error) {
        console.error("Error updating profile:", error);
        alert(`Failed to update profile: ${error.message}`);
        setLoading(false);
        return;
      }

      await supabase.auth.refreshSession();
      
      const {
        data: { session },
      } = await supabase.auth.getSession();
      
      if (session?.user) {
      }
      
      onUpdate();
      onClose();
    } finally {
      setLoading(false);
    }
  }

  function handleRemovePicture() {
    setRemovePicture(true);
    setProfilePicture(null);
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function handleClose() {
    setDisplayName(currentDisplayName || "");
    setGender(currentGender || "");
    setProfilePicture(null);
    setPreviewUrl(currentProfilePicture);
    setRemovePicture(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
      onClick={handleClose}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Edit Profile
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 text-2xl"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="flex flex-col items-center space-y-4">
            <div className="relative">
              {previewUrl ? (
                <div className="relative w-32 h-32 rounded-full overflow-hidden border-4 border-gray-200 dark:border-gray-700">
                  <Image
                    src={previewUrl}
                    alt="Profile picture"
                    fill
                    className="object-cover"
                  />
                </div>
              ) : (
                <div className="w-32 h-32 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                  <span className="text-gray-400 text-4xl">👤</span>
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
                id="profile-picture-input"
              />
              <label
                htmlFor="profile-picture-input"
                className="cursor-pointer bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 text-sm"
              >
                {profilePicture ? "Change Picture" : "Upload Picture"}
              </label>
              {(currentProfilePicture || previewUrl) && (
                <button
                  type="button"
                  onClick={handleRemovePicture}
                  className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 text-sm"
                >
                  Remove Picture
                </button>
              )}
            </div>
          </div>

          <div>
            <label
              htmlFor="display-name"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Display Name
            </label>
            <input
              id="display-name"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Enter your display name"
              className="border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white p-3 w-full rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label
              htmlFor="gender"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Gender
            </label>
            <select
              id="gender"
              value={gender}
              onChange={(e) => setGender(e.target.value)}
              className="border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white p-3 w-full rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select gender</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="non-binary">Non-binary</option>
              <option value="prefer-not-to-say">Prefer not to say</option>
            </select>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

