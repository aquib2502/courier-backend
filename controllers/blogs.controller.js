import Blog from "../models/blogs.model.js";
import slugify from 'slugify'
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
 * CREATE BLOG
 */
const createBlog = async (req, res) => {
  try {
    const {
      title,
      excerpt,
      content,
      featuredImage,
      author,
      category,
      tags,
      status,
      seoTitle,
      seoDescription,
      seoKeywords,
    } = req.body;

    console.log(req.body)
    if (!title || !content) {
      return res.status(400).json({
        success: false,
        message: "Title and content are required",
      });
    }

    const slug = await generateUniqueSlug(title);

    const blog = await Blog.create({
      title,
      slug,
      excerpt,
      content,
      featuredImage,
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

    const blogs = await Blog.find({
      status: "Published",
    })
      .sort({ publishedAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Blog.countDocuments({
      status: "Published",
    });

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

    if (
      req.body.title &&
      req.body.title.trim() !== blog.title.trim()
    ) {
      updateData.slug = await generateUniqueSlug(
        req.body.title,
        blog._id
      );
    }

    if (
      req.body.status === "Published" &&
      !blog.publishedAt
    ) {
      updateData.publishedAt = new Date();
    }

    const updatedBlog = await Blog.findByIdAndUpdate(
      req.params.id,
      updateData,
      {
        new: true,
        runValidators: true,
      }
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
    getPublishedBlogs
}