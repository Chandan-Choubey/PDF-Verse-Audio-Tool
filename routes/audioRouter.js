const express = require("express");
const multer = require("multer");
const ffmpeg = require("fluent-ffmpeg");
const path = require("path");
const fs = require("fs");
const router = express.Router();

const upload = multer({ dest: "uploads/" });

router.post("/trim", upload.single("audio"), (req, res) => {
  const { startTime, duration } = req.body;
  const audioFile = req.file;
  const outputFileName = `trimmed_audio_${Date.now()}.mp3`;
  const outputPath = path.join(__dirname, "../uploads", outputFileName);
  console.log(startTime);
  ffmpeg(audioFile.path)
    .setStartTime("10")
    // // .inputOptions([`-ss ${startTime}`])
    // // .seekInput(parseInt(startTime))
    .setDuration("20")
    // .complexFilter([
    //   { filter: "atrim", options: { start: "10", duration: "20" } },
    // ])

    .on("end", () => {
      console.log("Audio trimming finished.");

      res.download(outputPath, outputFileName, (err) => {
        if (err) {
          console.error("Error downloading the trimmed audio:", err);
        }
        fs.unlink(audioFile.path, () => {});
        fs.unlink(outputPath, () => {});
      });
    })
    .on("error", (err) => {
      console.error("Error while trimming audio:", err);
      res.status(500).send("An error occurred during audio processing.");
    })
    .save(outputPath);
});

router.post("/change-volume", upload.single("audio"), (req, res) => {
  const { volume } = req.body;
  const audioFile = req.file;
  const outputFileName = `adjusted_audio_${Date.now()}.mp3`;
  const outputPath = path.join(__dirname, "../uploads", outputFileName);

  console.log(`Received volume: ${volume}`);

  if (volume < 0 || volume > 2) {
    return res.status(400).send("Invalid volume level.");
  }

  // Change the volume using FFmpeg
  ffmpeg(audioFile.path)
    .audioFilter(`volume=${volume}`)
    .on("end", () => {
      console.log("Volume adjustment finished.");
      res.download(outputPath, outputFileName, (err) => {
        if (err) {
          console.error("Error downloading the adjusted audio:", err);
        }

        fs.unlink(audioFile.path, () => {});
        fs.unlink(outputPath, () => {});
      });
    })
    .on("error", (err) => {
      console.error("Error while changing audio volume:", err);
      res.status(500).send("An error occurred during audio processing.");
    })
    .save(outputPath);
});

router.post("/change-speed", upload.single("audio"), (req, res) => {
  const { speed } = req.body;
  const audioFile = req.file;
  const outputFileName = `adjusted_speed_audio_${Date.now()}.mp3`;
  const outputPath = path.join(__dirname, "../uploads", outputFileName);

  if (speed < 0.5 || speed > 2.0) {
    return res
      .status(400)
      .send("Invalid speed level. It must be between 0.5 and 2.0.");
  }

  ffmpeg(audioFile.path)
    .audioFilter(`atempo=${speed}`)
    .on("end", () => {
      console.log("Speed adjustment finished.");
      res.download(outputPath, outputFileName, (err) => {
        if (err) {
          console.error("Error downloading the adjusted audio:", err);
        }

        fs.unlink(audioFile.path, () => {});
        fs.unlink(outputPath, () => {});
      });
    })
    .on("error", (err) => {
      console.error("Error while changing audio speed:", err);
      res.status(500).send("An error occurred during audio processing.");
    })
    .save(outputPath);
});

router.post("/change-pitch", upload.single("audio"), (req, res) => {
  const { pitch } = req.body;
  const audioFile = req.file;
  const outputFileName = `adjusted_pitch_audio_${Date.now()}.mp3`;
  const outputPath = path.join(__dirname, "../uploads", outputFileName);

  if (pitch < 0.5 || pitch > 2.0) {
    return res
      .status(400)
      .send("Invalid pitch level. It must be between 0.5 and 2.0.");
  }

  const sampleRate = 44100 * pitch;

  ffmpeg(audioFile.path)
    .audioFilter(`asetrate=${sampleRate},aresample=44100`)
    .on("end", () => {
      console.log("Pitch adjustment finished.");
      res.download(outputPath, outputFileName, (err) => {
        if (err) {
          console.error("Error downloading the adjusted audio:", err);
        }

        fs.unlink(audioFile.path, () => {});
        fs.unlink(outputPath, () => {});
      });
    })
    .on("error", (err) => {
      console.error("Error while changing audio pitch:", err);
      res.status(500).send("An error occurred during audio processing.");
    })
    .save(outputPath);
});

router.post(
  "/reverse-audio",

  upload.single("audioFile"),
  (req, res) => {
    const inputFilePath = req.file.path;
    const outputFilePath = path.join(
      "uploads",
      `reversed_${req.file.originalname}`
    );

    ffmpeg(inputFilePath)
      .audioFilters("areverse")
      .on("end", () => {
        res.download(outputFilePath, (err) => {
          if (err) {
            console.error(err);
          }

          fs.unlinkSync(inputFilePath);
          fs.unlinkSync(outputFilePath);
        });
      })
      .on("error", (err) => {
        console.error("Error reversing audio:", err);
        res.status(500).send("An error occurred while processing the audio.");
      })
      .save(outputFilePath);
  }
);

router.post("/join-audio", upload.array("audioFiles", 10), (req, res) => {
  const audioFiles = req.files;
  if (!audioFiles.length) {
    return res.status(400).send("No audio files provided.");
  }

  const outputFileName = `joined_audio_${Date.now()}.mp3`;
  const outputPath = path.join(__dirname, "../uploads", outputFileName);

  const inputFiles = audioFiles.map((file) => `uploads/${file.filename}`);

  ffmpeg()
    .input(`concat:${inputFiles.join("|")}`)
    .audioCodec("libmp3lame")
    .on("end", () => {
      console.log("Audio joining finished.");
      res.download(outputPath, outputFileName, (err) => {
        if (err) {
          console.error("Error downloading the joined audio:", err);
        }

        audioFiles.forEach((file) => fs.unlink(file.path, () => {}));
        fs.unlink(outputPath, () => {});
      });
    })
    .on("error", (err) => {
      console.error("Error while joining audio files:", err);
      res.status(500).send("An error occurred during audio processing.");
    })
    .save(outputPath);
});

router.post("/apply-equalizer", upload.single("audioFile"), (req, res) => {
  const { bass, treble } = req.body;
  const audioFile = req.file;
  const outputFileName = `equalized_audio_${Date.now()}.mp3`;
  const outputPath = path.join(__dirname, "../uploads", outputFileName);

  ffmpeg(audioFile.path)
    .audioFilter([`bass=g=${bass}`, `treble=g=${treble}`])
    .on("end", () => {
      console.log("Equalizer adjustment finished.");
      res.download(outputPath, outputFileName, (err) => {
        if (err) {
          console.error("Error downloading the equalized audio:", err);
        }

        fs.unlink(audioFile.path, () => {});
        fs.unlink(outputPath, () => {});
      });
    })
    .on("error", (err) => {
      console.error("Error during equalizer processing:", err);
      res.status(500).send("An error occurred during equalizer processing.");
    })
    .save(outputPath);
});

module.exports = router;
