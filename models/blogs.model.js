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

    author: {
      type: String,
      default: "Admin",
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