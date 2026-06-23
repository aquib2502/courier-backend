import Blog from "../models/blogs.model.js";
import slugify from 'slugify';

/**
 * Generate unique slug
 */
const generateUniqueSlug = async (title, blogId = null) => {
  let slug = slugify(title, {
    lower: true,
    strict: true,
    trim: true,
  });

  let existingBlog = await Blog.findOne({
    slug,
    ...(blogId && { _id: { $ne: blogId } }),
  });

  let counter = 1;

  while (existingBlog) {
    const newSlug = `${slug}-${counter}`;

    existingBlog = await Blog.findOne({
      slug: newSlug,
      ...(blogId && { _id: { $ne: blogId } }),
    });

    if (!existingBlog) {
      slug = newSlug;
      break;
    }

    counter++;
  }

  return slug;
};

/**
 * UPLOAD IMAGES
 * POST /api/blogs/upload
 * Accepts: multipart/form-data
 *   - featuredImage (single, optional)
 *   - gallery       (multiple, optional)
 * Returns URLs served from your own domain as static files.
 */
const uploadImages = async (req, res) => {
  try {
    const BASE_URL = process.env.BASE_URL || `${req.protocol}://${req.get('host')}`;

    const result = {};

    if (req.files?.featuredImage?.[0]) {
      const file = req.files.featuredImage[0];
      result.featuredImage = `${BASE_URL}/uploads/blogs/${file.filename}`;
    }

    if (req.files?.gallery?.length) {
      result.gallery = req.files.gallery.map(
        (f) => `${BASE_URL}/uploads/blogs/${f.filename}`
      );
    }

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Upload Images Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * CREATE BLOG
 */
const createBlog = async (req, res) => {
  try {
    const {
      title,
      excerpt,
      content,
      featuredImage,
      gallery,
      author,
      category,
      tags,
      status,
      seoTitle,
      seoDescription,
      seoKeywords,
    } = req.body;

    if (!title || !content) {
      return res.status(400).json({
        success: false,
        message: "Title and content are required",
      });
    }

    const slug = await generateUniqueSlug(title);

    // gallery may arrive as a JSON string if sent via FormData
    let parsedGallery = gallery;
    if (typeof gallery === 'string') {
      try { parsedGallery = JSON.parse(gallery); } catch { parsedGallery = []; }
    }

    const blog = await Blog.create({
      title,
      slug,
      excerpt,
      content,
      featuredImage,
      gallery: parsedGallery || [],
      author,
      category,
      tags,
      status,
      seoTitle,
      seoDescription,
      seoKeywords,
      publishedAt: status === "Published" ? new Date() : null,
    });

    return res.status(201).json({
      success: true,
      message: "Blog created successfully",
      data: blog,
    });
  } catch (error) {
    console.error("Create Blog Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * ADMIN - GET ALL BLOGS
 */
const getBlogs = async (req, res) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const filter = {};

    if (req.query.status) {
      filter.status = req.query.status;
    }

    const blogs = await Blog.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Blog.countDocuments(filter);

    return res.status(200).json({
      success: true,
      total,
      page,
      pages: Math.ceil(total / limit),
      data: blogs,
    });
  } catch (error) {
    console.error("Get Blogs Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * ADMIN - GET SINGLE BLOG BY ID
 */
const getBlogById = async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);

    if (!blog) {
      return res.status(404).json({
        success: false,
        message: "Blog not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: blog,
    });
  } catch (error) {
    console.error("Get Blog Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * FRONTEND - GET BLOG BY SLUG
 */
const getBlogBySlug = async (req, res) => {
  try {
    const blog = await Blog.findOne({
      slug: req.params.slug,
      status: "Published",
    });

    if (!blog) {
      return res.status(404).json({
        success: false,
        message: "Blog not found",
      });
    }

    await Blog.findByIdAndUpdate(blog._id, {
      $inc: { views: 1 },
    });

    return res.status(200).json({
      success: true,
      data: blog,
    });
  } catch (error) {
    console.error("Get Blog By Slug Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * FRONTEND - GET PUBLISHED BLOGS
 */
const getPublishedBlogs = async (req, res) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const blogs = await Blog.find({ status: "Published" })
      .sort({ publishedAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Blog.countDocuments({ status: "Published" });

    return res.status(200).json({
      success: true,
      total,
      page,
      pages: Math.ceil(total / limit),
      data: blogs,
    });
  } catch (error) {
    console.error("Published Blogs Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * UPDATE BLOG
 */
const updateBlog = async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);

    if (!blog) {
      return res.status(404).json({
        success: false,
        message: "Blog not found",
      });
    }

    const updateData = { ...req.body };

    // Parse gallery if it arrived as a JSON string
    if (typeof updateData.gallery === 'string') {
      try { updateData.gallery = JSON.parse(updateData.gallery); } catch { updateData.gallery = []; }
    }

    if (req.body.title && req.body.title.trim() !== blog.title.trim()) {
      updateData.slug = await generateUniqueSlug(req.body.title, blog._id);
    }

    if (req.body.status === "Published" && !blog.publishedAt) {
      updateData.publishedAt = new Date();
    }

    const updatedBlog = await Blog.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );

    return res.status(200).json({
      success: true,
      message: "Blog updated successfully",
      data: updatedBlog,
    });
  } catch (error) {
    console.error("Update Blog Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * DELETE BLOG
 */
const deleteBlog = async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);

    if (!blog) {
      return res.status(404).json({
        success: false,
        message: "Blog not found",
      });
    }

    await Blog.findByIdAndDelete(req.params.id);

    return res.status(200).json({
      success: true,
      message: "Blog deleted successfully",
    });
  } catch (error) {
    console.error("Delete Blog Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export {
  createBlog,
  getBlogById,
  getBlogBySlug,
  getBlogs,
  updateBlog,
  deleteBlog,
  getPublishedBlogs,
  uploadImages,
};