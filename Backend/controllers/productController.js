const multer = require('multer');
const Product = require('../models/Product');
const Notification = require("../models/Notification");
const { uploadImagesToCloudinary } = require('./imagecontroller');

// ✅ Multer setup
const storage = multer.memoryStorage();
const upload = multer({ storage });
exports.uploadMiddleware = upload.array('images', 5); // max 5 images

// ===============================
// 📦 Add Product Controller
// ===============================
exports.addProduct = async (req, res) => {
  try {
    const {
      title,
      description,
      price,
      discountPrice,
      category,
      status,
      stock,
      productType,
      brand,
      gstRate,
      lowStockAlert
    } = req.body;

    // Validate required text fields
    if (!title || !description || !price || !stock || !category) {
      return res.status(400).json({
        message: 'All text fields are required',
      });
    }

    // Validate image files
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        message: 'At least one image file is required',
      });
    }

    // Upload images to Cloudinary
    const imageUrls = await uploadImagesToCloudinary(req.files, 'products');

    // Add product in MongoDB
    const product = await Product.create({
      title,
      description,
      price,
      discountPrice,
      category,
      images: imageUrls,
      stock,
      productType,
      brand,
      gstRate,
      lowStockAlert,
    });

    // ⚠️ Create low-stock notification automatically
    if (product.stock <= (product.lowStockAlert || 5)) {
      await Notification.create({
        type: "warning",
        message: `⚠️ Stock low for '${product.title}' (${product.stock} left)`,
      });
    }

    res.status(201).json({
      success: true,
      message: 'Product added successfully',
      product,
    });

  } catch (error) {
    console.error('Error adding product:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while adding product',
      error: error.message,
    });
  }
};


// Update Product by ID
exports.updateProductById = async (req, res) => {
  try {
    const { id } = req.params; // Get product ID from URL
    const updateData = req.body;

    // Check if product exists
    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    // Validate enum fields if present
    if (updateData.status && !["Active", "Draft", "Out of Stock", "Low Stock"].includes(updateData.status)) {
      return res.status(400).json({ success: false, message: "Invalid status value" });
    }
    if (updateData.category && !["Man", "Woman", "Kids"].includes(updateData.category)) {
      return res.status(400).json({ success: false, message: "Invalid category value" });
    }

    // Ensure images is an array if provided
    if (updateData.images && !Array.isArray(updateData.images)) {
      return res.status(400).json({ success: false, message: "Images must be an array" });
    }

    // Update the product
    const updatedProduct = await Product.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    });

    return res.status(200).json({
      success: true,
      message: "✅ Product updated successfully",
      product: updatedProduct,
    });
  } catch (error) {
    console.error("Error updating product:", error);
    res.status(500).json({
      success: false,
      message: "Server error while updating product",
      error: error.message,
    });
  }
};



// fetch products

// Search products by title or description (case-insensitive)
exports.searchProducts = async (req, res) => {
  try {
    const { query } = req.query;

    if (!query || query.trim() === "") {
      return res.status(400).json({ success: false, message: "Search query is required" });
    }

    const products = await Product.find({
      isDeleted: false,
      $or: [
        { title: { $regex: query, $options: "i" } },
        { description: { $regex: query, $options: "i" } }
      ]
    });

    res.status(200).json({
      success: true,
      count: products.length,
      products
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error while searching products",
      error: error.message
    });
  }
};

// ===============================
// 💰 Get Products by Price Range
// ===============================
exports.getProductsByRange = async (req, res) => {
  try {
    const { min, max } = req.query;
    const minPrice = Number(min) || 0;
    const maxPrice = Number(max) || Infinity;

    const products = await Product.find({
      isDeleted: false,
      price: { $gte: minPrice, $lte: maxPrice }
    });

    res.status(200).json({
      success: true,
      count: products.length,
      products
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error while fetching products by price range",
      error: error.message
    });
  }
};

// ===============================
// 🗑 Soft Delete Product
// ===============================
exports.softDeleteProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const product = await Product.findById(id);

    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    product.isDeleted = true;
    await product.save();

    res.status(200).json({ success: true, message: "Product soft-deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error while deleting product", error: error.message });
  }
};

// ===============================
// 🗑 Hard Delete Product
// ===============================
exports.hardDeleteProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const product = await Product.findById(id);

    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    await Product.findByIdAndDelete(id);
    res.status(200).json({ success: true, message: "Product permanently deleted" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error while deleting product", error: error.message });
  }
};
