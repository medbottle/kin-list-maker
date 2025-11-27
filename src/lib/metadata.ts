import type { Metadata } from "next";

export const siteMetadata = {
  name: "Kin List Maker",
  description: "An easy and simple way of showcasing your kin list",
  url: "https://kin-list-maker.vercel.app",
};

export const metadataByPath: Record<string, Metadata> = {
  "/": {
    title: siteMetadata.name,
    description: siteMetadata.description,
  },
  "/characters": {
    title: `Characters - ${siteMetadata.name}`,
    description: "Browse and search for characters to add to your kin list",
  },
  "/profile": {
    title: `Profile - ${siteMetadata.name}`,
    description: "View and manage your profile, favorite characters, and lists",
  },
  "/login": {
    title: `Login - ${siteMetadata.name}`,
    description: "Login to your Kin List Maker account",
  },
};

