import express from 'express'
const router = express.Router()
import { createBlog,
  getBlogs,
  getBlogById,
  updateBlog,
  deleteBlog,
  getPublishedBlogs,
  getBlogBySlug,
 } from '../controllers/blogs.controller.js';

/**
 * Admin Routes
 */
router.post("/", createBlog);
router.get("/", getPublishedBlogs);
router.get("/admin", getBlogs);
router.get("/admin/:id", getBlogById);
router.put("/:id", updateBlog);
router.delete("/:id", deleteBlog);

/**
 * Frontend Routes
 */
router.get("/:slug", getBlogBySlug);

const blogRoutes = router;
export default blogRoutes