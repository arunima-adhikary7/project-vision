const express = require("express");
const router = express.Router();
const {
  getWishlist,
  addToWishlist,
  removeFromWishlist,
} = require("../controllers/wishlistController.js"); // ✅ Make sure the filename matches exactly
const { isAuthenticated } = require("../middleware/auth.js");

// ✅ Get the user's wishlist
router.get("/", isAuthenticated, getWishlist);

// ✅ Add a product to the wishlist
router.post("/add", isAuthenticated, addToWishlist);

// ✅ Remove a product from the wishlist
router.delete("/remove/:productId", isAuthenticated, removeFromWishlist);
// 🔹 Use DELETE and productId in params for cleaner REST API design

module.exports = router;
