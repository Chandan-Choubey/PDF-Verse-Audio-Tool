const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { PDFDocument } = require("pdf-lib");
const sharp = require("sharp");
const pdf2pic = require("pdf2pic");
const router = express.Router();

const upload = multer({ storage: multer.memoryStorage() });

router.get("/compress-pdf", (req, res) => {
  res.render("compress");
});

router.post("/compress", upload.single("pdfFile"), async (req, res) => {
  try {
    console.log("hit backend");

    if (!req.file || !req.file.buffer) {
      throw new Error("No file uploaded or file buffer is missing.");
    }

    const pdfBuffer = req.file.buffer;
    const pdfDoc = await PDFDocument.load(pdfBuffer);

    // Remove metadata
    pdfDoc.setTitle("");
    pdfDoc.setAuthor("");
    pdfDoc.setSubject("");
    pdfDoc.setKeywords([]);
    pdfDoc.setProducer("");
    pdfDoc.setCreator("");

    // Convert PDF pages to images, compress them, and add them back to a new PDF
    const newPdfDoc = await PDFDocument.create();
    const pages = pdfDoc.getPages();

    const pdf2picOptions = {
      format: "png",
      size: "600x600",
      density: 72,
      savePath: "./temp-images",
    };
    const converter = pdf2pic(pdf2picOptions);

    // Ensure temp folder exists
    if (!fs.existsSync(pdf2picOptions.savePath)) {
      fs.mkdirSync(pdf2picOptions.savePath, { recursive: true });
    }

    // Loop through pages and process each
    for (let i = 0; i < pages.length; i++) {
      const page = pages[i];
      const { width, height } = page.getSize();

      // Convert PDF page to PNG image
      const pageImagePath = await converter.convert(i + 1);

      if (!pageImagePath.path) {
        throw new Error("Error converting PDF page to image.");
      }

      // Compress image using Sharp
      const pngImage = fs.readFileSync(pageImagePath.path);
      const compressedImage = await sharp(pngImage)
        .resize(width, height, { fit: "inside" })
        .jpeg({ quality: 50 })
        .toBuffer();

      // Embed compressed image in new PDF
      const newImage = await newPdfDoc.embedJpg(compressedImage);
      const newPage = newPdfDoc.addPage([width, height]);
      newPage.drawImage(newImage, {
        x: 0,
        y: 0,
        width,
        height,
      });

      // Clean up temp image file
      fs.unlinkSync(pageImagePath.path);
    }

    // Save new compressed PDF to buffer
    const compressedPdfBytes = await newPdfDoc.save();

    // Write compressed PDF to disk and send it as a download
    const compressedPdfPath = path.join(__dirname, "compressed.pdf");
    fs.writeFileSync(compressedPdfPath, compressedPdfBytes);

    // Send compressed PDF as a download and delete it afterward
    res.download(compressedPdfPath, "compressed.pdf", (err) => {
      if (err) throw err;
      fs.unlinkSync(compressedPdfPath);
    });
  } catch (error) {
    console.error("Error during PDF compression:", error);

    res.status(500).send("An error occurred while compressing the PDF.");
  }
});

module.exports = router;
