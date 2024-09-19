const multer = require("multer");
const { PDFDocument } = require("pdf-lib");
const fs = require("fs").promises; // Use fs.promises for asynchronous operations
const path = require("path");
const sharp = require("sharp");
const express = require("express");
const router = express.Router();

// Configure multer for file uploads
const upload = multer({ dest: path.join(__dirname, "../uploads") });

// Endpoint to convert image to PDF
router.post("/image-to-pdf", upload.single("image"), async (req, res) => {
  const { file } = req;

  if (!file) {
    return res.status(400).json({ error: "Image file is required" });
  }

  const imagePath = path.join(__dirname, "../uploads", file.filename);
  const pngImagePath = path.join(
    __dirname,
    "../uploads",
    file.filename + ".png"
  );

  try {
    // Convert the uploaded image to PNG using sharp
    await sharp(imagePath).toFile(pngImagePath);

    // Read the PNG image
    const imageBytes = await fs.readFile(pngImagePath);

    // Create a new PDFDocument
    const pdfDoc = await PDFDocument.create();
    const image = await pdfDoc.embedPng(imageBytes);
    const page = pdfDoc.addPage([image.width, image.height]);
    page.drawImage(image, {
      x: 0,
      y: 0,
      width: image.width,
      height: image.height,
    });

    const pdfBytes = await pdfDoc.save();

    // Send the PDF back to the client
    res.setHeader("Content-Disposition", "attachment; filename=image.pdf");
    res.setHeader("Content-Type", "application/pdf");
    res.send(Buffer.from(pdfBytes));
  } catch (error) {
    console.error("Error converting image to PDF:", error);
    if (!res.headersSent) {
      res.status(500).json({ error: "Error converting image to PDF" });
    }
  } finally {
    // Clean up files
    try {
      await fs.unlink(imagePath);
      await fs.unlink(pngImagePath);
    } catch (cleanupError) {
      console.error("Error cleaning up files:", cleanupError);
    }
  }
});

module.exports = router;
