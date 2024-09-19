const express = require("express");
const multer = require("multer");
const JSZip = require("jszip");
const path = require("path");
const fs = require("fs");
const pdfPoppler = require("pdf-poppler");
const router = express.Router();

const upload = multer({ storage: multer.memoryStorage() });

router.get("/pdf-to-png", (req, res) => {
  res.render("pdf-to-png", { title: "Convert PDF to Images" });
});

router.post("/png-convert", upload.single("file"), async (req, res) => {
  if (!req.file || req.file.mimetype !== "application/pdf") {
    res.status(400).send("Please upload a valid PDF file.");
    return;
  }

  try {
    const pdfBuffer = req.file.buffer;
    const tempFilePath = path.join(__dirname, "temp.pdf");
    const outputDir = path.join(__dirname, "output");
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir);
    }
    const zip = new JSZip();

    // Save PDF to a temporary file
    fs.writeFileSync(tempFilePath, pdfBuffer);

    // Convert PDF to images
    const options = {
      format: "png", // Output format
      out_dir: outputDir, // Directory to save images
      out_prefix: "output", // Prefix for output images
      page_numbers: [], // Convert all pages
    };

    await pdfPoppler.convert(tempFilePath, options);

    // Read images from output directory and add to zip
    const files = fs.readdirSync(outputDir);
    files.forEach((file) => {
      const filePath = path.join(outputDir, file);
      const image = fs.readFileSync(filePath);
      zip.file(file, image);
    });

    // Clean up temporary files
    fs.unlinkSync(tempFilePath);
    fs.rmSync(outputDir, { recursive: true });

    // Send zip file as response
    zip.generateAsync({ type: "nodebuffer" }).then((zipBuffer) => {
      res.setHeader("Content-Disposition", "attachment; filename=images.zip");
      res.setHeader("Content-Type", "application/zip");
      res.send(zipBuffer);
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("An error occurred while processing the PDF file.");
  }
});

module.exports = router;
