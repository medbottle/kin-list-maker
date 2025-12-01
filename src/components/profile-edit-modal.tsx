"use client";

import { useState, useRef, useEffect } from "react";
import { createClient } from "@/lib/supabase-client";
import Image from "next/image";
import { Upload, Trash2, X } from "lucide-react";

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
          alert("Failed to delete old profile picture. Please try again later.");
        }
        profilePictureUrl = null;
      }

      if (profilePicture) {
        const fileExt = profilePicture.name.split(".").pop();
        const fileName = `${user.id}-${Date.now()}.${fileExt}`;
        const filePath = `profile-pictures/${fileName}`;

        const { error: uploadError } = await supabase.storage
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

      // Update profiles table
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          display_name: displayName || null,
          gender: gender || null,
          profile_picture_url: profilePictureUrl || null,
        })
        .eq("id", user.id);

      if (profileError) {
        console.error("Error updating profile:", profileError);
        alert(`Failed to update profile: ${profileError.message}`);
        setLoading(false);
        return;
      }

      // Also update user metadata for backward compatibility
      const updatedMetadata = {
        ...(user?.user_metadata || {}),
        display_name: displayName || null,
        gender: gender || null,
        profile_picture: profilePictureUrl || null,
      };

      const { error: updateUserError } = await supabase.auth.updateUser({
        data: updatedMetadata,
      });

      if (updateUserError) {
        console.error("Error updating user metadata:", updateUserError);
        alert(`Failed to update user metadata: ${updateUserError.message}`);
        setLoading(false);
        return;
      }


      // Refresh session to ensure metadata is updated
      await supabase.auth.refreshSession();
      
      // Wait a moment for the refresh to propagate
      await new Promise(resolve => setTimeout(resolve, 200));
      
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={handleClose}
    >
      <div
        className="bg-white dark:bg-gray-900 rounded-lg shadow-lg max-w-md w-full mx-4 p-6 space-y-4 max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Edit Profile
          </h2>
          <button
            onClick={handleClose}
            className="p-2 rounded border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            title="Close"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex flex-col items-center space-y-3">
            <div className="relative">
              {previewUrl ? (
                <div className="relative w-24 h-24 rounded-full overflow-hidden">
                  <Image
                    src={previewUrl}
                    alt="Profile picture"
                    fill
                    className="object-cover"
                  />
                </div>
              ) : (
                <div className="w-24 h-24 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                  <span className="text-gray-400 text-2xl">👤</span>
                </div>
              )}
            </div>
            <div className="flex mt-2 gap-2 items-center justify-center">
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
                className="cursor-pointer p-2 rounded border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex items-center justify-center"
                title={profilePicture ? "Change Picture" : "Upload Picture"}
                aria-label={profilePicture ? "Change Picture" : "Upload Picture"}
              >
                <Upload className="h-5 w-5" />
              </label>
              {(currentProfilePicture || previewUrl) && (
                <button
                  type="button"
                  onClick={handleRemovePicture}
                  className="p-2 rounded border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex items-center justify-center ml-1"
                  title="Remove Picture"
                  aria-label="Remove Picture"
                >
                  <Trash2 className="h-5 w-5 text-red-600 dark:text-red-500" />
                </button>
              )}
            </div>
          </div>

          <div>
            <label
              htmlFor="display-name"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Display Name
            </label>
            <input
              id="display-name"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Enter your display name"
              className="border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white p-2 w-full rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label
              htmlFor="gender"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Gender
            </label>
            <select
              id="gender"
              value={gender}
              onChange={(e) => setGender(e.target.value)}
              className="border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white p-2 w-full rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select gender</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="non-binary">Non-binary</option>
              <option value="prefer-not-to-say">Prefer not to say</option>
            </select>
          </div>

          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={handleClose}
              className="p-2 rounded border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="p-2 rounded border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              {loading ? "Saving..." : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

