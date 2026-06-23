import express from 'express';
const router = express.Router();
import {
  createBlog,
  getBlogs,
  getBlogById,
  updateBlog,
  deleteBlog,
  getPublishedBlogs,
  getBlogBySlug,
  uploadImages,
} from '../controllers/blogs.controller.js';
import upload from '../middlewares/upload.js';

/**
 * Image Upload Route
 * Accepts: featuredImage (single) + gallery (up to 10 images)
 */
router.post(
  "/upload",
  upload.fields([
    { name: "featuredImage", maxCount: 1 },
    { name: "gallery", maxCount: 10 },
    { name: "contentImage", maxCount: 1 },
    { name: "authorImage", maxCount: 1 },
  ]),
  uploadImages
);

/**
 * Admin Routes
 */
router.post("/", createBlog);
router.get("/admin", getBlogs);
router.get("/admin/:id", getBlogById);
router.put("/:id", updateBlog);
router.delete("/:id", deleteBlog);

/**
 * Frontend Routes
 */
router.get("/", getPublishedBlogs);
router.get("/:slug", getBlogBySlug);

const blogRoutes = router;
export default blogRoutes;