import express from "express";
import authRoutes from "./auth.routes";

const router = express.Router();

router.use("/auth", authRoutes);

// Add other route groups here as needed
// router.use('/products', productRoutes);
// router.use('/orders', orderRoutes);

export default router;
