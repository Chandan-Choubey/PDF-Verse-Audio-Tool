const express = require("express");
const multer = require("multer");
const officegen = require("officegen");
const pdfParse = require("pdf-parse");
const path = require("path");

const upload = multer({ storage: multer.memoryStorage() });
const router = express.Router();

router.get("/pdf-to-ppt", (req, res) => {
  res.render("pdftoppt", { title: "Convert PDF to PowerPoint" });
});

router.post("/ppt-convert", upload.single("file"), async (req, res) => {
  if (!req.file || req.file.mimetype !== "application/pdf") {
    return res.status(400).send("Please upload a valid PDF file.");
  }

  try {
    const pdfBuffer = req.file.buffer;
    const pdfDocument = await pdfParse(pdfBuffer);

    const pptx = officegen("pptx");
    const pages = pdfDocument.text.split(/\f/);

    pages.forEach((pageText) => {
      const slide = pptx.makeNewSlide();
      slide.addText(pageText, { x: 0.5, y: 0.5, w: "90%", h: "90%" });
    });

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation"
    );
    res.setHeader("Content-Disposition", "attachment; filename=output.pptx");
    pptx.generate(res);
  } catch (err) {
    console.error(err);
    res.status(500).send("An error occurred while processing the PDF file.");
  }
});

module.exports = router;
