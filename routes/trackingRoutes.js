import { Router } from "express";
import { getTracking } from "../controllers/trackingController.js";

const router = Router();

router.post("/getTracking", getTracking);


export default router;