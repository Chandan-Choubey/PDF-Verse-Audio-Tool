const express = require("express");
const bodyParser = require("body-parser");
const mergeRouter = require("./routes/merge");
const splitRouter = require("./routes/split");
const editorRouter = require("./routes/editor");
const watermarkRouter = require("./routes/watermark");
const deleteRouter = require("./routes/delete");
const pageNoRoute = require("./routes/pageno");
const rotatePdf = require("./routes/rotate");
const pdfToWord = require("./routes/pdf-to-word");
const pdfToExcel = require("./routes/pdftoexcel");
const pdfToPpt = require("./routes/pdf-to-ppt");
const pdfToPng = require("./routes/pdf-to-png");
const pdfToJpg = require("./routes/pdf-to-jpg");
const pdfToJson = require("./routes/pdf-to-json");
const pdfToTiff = require("./routes/pdf-to-tiff");
const pdfToTxt = require("./routes/pdf-to-txt");
const wordToPdf = require("./routes/word-to-pdf");
const compressPdf = require("./test");
const imgtoPdf = require("./routes/imgtopdf");
const audioRouter = require("./routes/audioRouter");
const videoRouter = require("./routes/videoRouter");
const userRouter = require("./routes/userlogin");
const cors = require("cors");
const cookieParser = require("cookie-parser");
require("dotenv").config();
const app = express();
const path = require("path");
const { default: mongoose } = require("mongoose");

app.use(cors());

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log("Connected to MongoDB");
  })
  .catch((err) => {
    console.error("MongoDB connection error:", err);
  });

app.use(bodyParser.json());
app.use(cookieParser());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.urlencoded({ extended: true }));
app.set("views", path.join(__dirname, "/views"));
app.set("view engine", "ejs");
app.use(express.static(path.join(__dirname, "public")));
app.use(mergeRouter);
app.use(splitRouter);
app.use(editorRouter);
app.use(watermarkRouter);
app.use(deleteRouter);
app.use(pageNoRoute);
app.use(rotatePdf);
app.use(pdfToWord);
app.use(pdfToExcel);
app.use(pdfToPpt);
app.use(pdfToPng);
app.use(pdfToJpg);
app.use(pdfToJson);
app.use(pdfToTiff);
app.use(pdfToTxt);
app.use(wordToPdf);
app.use(compressPdf);
app.use(imgtoPdf);
app.use(audioRouter);
app.use(videoRouter);
app.use(userRouter);
app.use(express.static(path.join(__dirname, "public")));

app.listen(8080, () => {
  console.log("Server is running on port 8080");
});
