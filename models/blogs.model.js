import mongoose from "mongoose";

const blogSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },

    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    excerpt: {
      type: String,
      trim: true,
      maxlength: 500,
    },

    content: {
      type: String,
      required: true,
    },

    featuredImage: {
      type: String,
      default: "",
    },

    // NEW: multiple gallery images served from your own domain
    gallery: [
      {
        type: String,
        trim: true,
      },
    ],

    author: {
      type: String,
      default: "Admin",
    },

    // Author bio block — shown at the end of the article
    authorImage: {
      type: String,
      default: "",
    },

    authorBio: {
      type: String,
      trim: true,
      default: "",
    },

    authorSocial: {
      linkedin: { type: String, trim: true, default: "" },
      twitter: { type: String, trim: true, default: "" },
      instagram: { type: String, trim: true, default: "" },
      facebook: { type: String, trim: true, default: "" },
      website: { type: String, trim: true, default: "" },
    },

    category: {
      type: String,
      trim: true,
      default: "General",
    },

    tags: [
      {
        type: String,
        trim: true,
      },
    ],

    status: {
      type: String,
      enum: ["Draft", "Published"],
      default: "Draft",
    },

    publishedAt: {
      type: Date,
      default: null,
    },

    seoTitle: {
      type: String,
      trim: true,
    },

    seoDescription: {
      type: String,
      trim: true,
    },

    seoKeywords: [
      {
        type: String,
        trim: true,
      },
    ],

    views: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

const Blog = mongoose.model("Blogs", blogSchema);

export default Blog;