const express = require("express");
const multer = require("multer");
const ffmpeg = require("fluent-ffmpeg");
const path = require("path");
const fs = require("fs");

const router = express.Router();
const upload = multer({ dest: "uploads/" });

//add audio to video
router.post(
  "/add-audio-to-video",
  upload.fields([{ name: "video" }, { name: "audio" }]),
  (req, res) => {
    const videoPath = path.join(
      __dirname,
      "..",
      "uploads",
      req.files["video"][0].filename
    );
    const audioPath = path.join(
      __dirname,
      "..",
      "uploads",
      req.files["audio"][0].filename
    );
    const outputPath = path.join(
      __dirname,
      "..",
      "uploads",
      `${Date.now()}_with_audio.mp4`
    );

    ffmpeg(videoPath)
      .input(audioPath)
      .audioCodec("aac")
      .videoCodec("libx264")
      .outputOptions("-shortest")
      .on("end", () => {
        res.download(outputPath, () => {
          fs.unlinkSync(videoPath);
          fs.unlinkSync(audioPath);
          fs.unlinkSync(outputPath);
        });
      })
      .on("error", (err) => {
        console.error("Error:", err);
        res.status(500).send("Error adding audio to video.");
      })
      .save(outputPath);
  }
);

//add image to video
router.post(
  "/add-image-to-video",
  upload.fields([{ name: "video" }, { name: "image" }]),
  async (req, res) => {
    const videoFile = req.files.video[0];
    const imageFile = req.files.image[0];

    const outputFileName = `output_with_image_${Date.now()}.mp4`;
    const outputPath = path.join(__dirname, "../uploads", outputFileName);

    try {
      ffmpeg(videoFile.path)
        .input(imageFile.path)
        .complexFilter([
          {
            filter: "overlay",
            options: {
              x: "(main_w-overlay_w)/2",
              y: "(main_h-overlay_h)/2",
            },
          },
        ])
        .on("start", (commandLine) => {
          console.log(`Spawned FFmpeg with command: ${commandLine}`);
        })
        .on("error", (err) => {
          console.log("An error occurred: " + err.message);
          fs.unlink(videoFile.path, () => {});
          fs.unlink(imageFile.path, () => {});
          return res
            .status(500)
            .send("An error occurred while processing the video.");
        })
        .on("end", () => {
          console.log("Processing finished!");

          res.download(outputPath, outputFileName, (err) => {
            if (err) {
              console.error("Error downloading the processed video:", err);
            }

            fs.unlink(videoFile.path, () => {});
            fs.unlink(imageFile.path, () => {});
            fs.unlink(outputPath, () => {});
          });
        })
        .save(outputPath);
    } catch (error) {
      console.error("Error while processing:", error);
      fs.unlink(videoFile.path, () => {});
      fs.unlink(imageFile.path, () => {});
      return res
        .status(500)
        .send("An error occurred while processing the video.");
    }
  }
);

router.post("/add-text-to-video", upload.single("video"), async (req, res) => {
  const videoFile = req.file;
  const text = req.body.text || "";

  const outputFileName = `output_with_text_${Date.now()}.mp4`;
  const outputPath = path.join(__dirname, "../uploads", outputFileName);

  try {
    ffmpeg(videoFile.path)
      .complexFilter([
        {
          filter: "drawtext",
          options: {
            text: text,
            x: "(w-text_w)/2",
            y: "(h-text_h)/2",
            fontsize: 100,
            fontcolor: "white",
            box: 1,
            boxcolor: "black@0.5",
            boxborderw: 5,
          },
        },
      ])
      .on("start", (commandLine) => {
        console.log(`Spawned FFmpeg with command: ${commandLine}`);
      })
      .on("error", (err) => {
        console.log("An error occurred: " + err.message);
        return res
          .status(500)
          .send("An error occurred while processing the video.");
      })
      .on("end", () => {
        console.log("Processing finished!");

        const processedVideoUrl = `${req.protocol}://${req.get(
          "host"
        )}/uploads/${outputFileName}`;

        setTimeout(() => {
          fs.unlink(videoFile.path, () => {});
          fs.unlink(outputPath, () => {});
        }, 10000);

        res.json({ videoUrl: processedVideoUrl });
      })
      .save(outputPath);
  } catch (error) {
    console.error("Error while processing:", error);
    return res
      .status(500)
      .send("An error occurred while processing the video.");
  }
});

router.post("/convert-video", upload.single("video"), (req, res) => {
  const videoFile = req.file;
  const format = req.body.format || "mp4";
  const outputFileName = `converted_${Date.now()}.${format}`;
  const outputPath = path.join(__dirname, "..", "uploads", outputFileName);

  if (!videoFile) {
    return res.status(400).send("No video file uploaded.");
  }

  ffmpeg(videoFile.path)
    .toFormat(format)
    .on("end", () => {
      res.download(outputPath, (err) => {
        if (err) {
          console.error("Error downloading file:", err);
          res.status(500).send("Error downloading file.");
        }

        fs.unlink(videoFile.path, () => {});
        fs.unlink(outputPath, () => {});
      });
    })
    .on("error", (err) => {
      console.error("Error:", err);
      res.status(500).send("Error converting video.");
    })
    .save(outputPath);
});

router.post("/crop-video", upload.single("video"), (req, res) => {
  const videoFile = req.file;
  const outputFileName = `cropped_${Date.now()}.mp4`;
  const outputPath = path.join(__dirname, "..", "uploads", outputFileName);

  if (!videoFile) {
    return res.status(400).send("No video file uploaded.");
  }

  const x = parseInt(req.body.x) || 100;
  const y = parseInt(req.body.y) || 50;
  const width = parseInt(req.body.width) || 640;
  const height = parseInt(req.body.height) || 360;

  ffmpeg(videoFile.path)
    .videoFilters(`crop=${width}:${height}:${x}:${y}`)
    .on("end", () => {
      res.download(outputPath, (err) => {
        if (err) {
          console.error("Error downloading file:", err);
          res.status(500).send("Error downloading file.");
        }

        fs.unlink(videoFile.path, () => {});
        fs.unlink(outputPath, () => {});
      });
    })
    .on("error", (err) => {
      console.error("Error:", err);
      res.status(500).send("Error cropping video.");
    })
    .save(outputPath);
});

router.post("/rotate-video", upload.single("video"), (req, res) => {
  const videoFile = req.file;
  const angle = parseInt(req.body.angle) || 90;
  const outputFileName = `rotated_${Date.now()}.mp4`;
  const outputPath = path.join(__dirname, "..", "uploads", outputFileName);

  if (!videoFile) {
    return res.status(400).send("No video file uploaded.");
  }

  ffmpeg(videoFile.path)
    .videoFilters(`rotate=${angle}*PI/180`)
    .on("end", () => {
      res.download(outputPath, (err) => {
        if (err) {
          console.error("Error downloading file:", err);
          return res.status(500).send("Error downloading file.");
        }

        fs.unlink(videoFile.path, (unlinkErr) => {
          if (unlinkErr)
            console.error("Error removing original file:", unlinkErr);
        });
        fs.unlink(outputPath, (unlinkErr) => {
          if (unlinkErr)
            console.error("Error removing rotated file:", unlinkErr);
        });
      });
    })
    .on("error", (err) => {
      console.error("Error:", err);
      res.status(500).send("Error rotating video.");
    })
    .save(outputPath);
});

router.post("/flip-video", upload.single("video"), (req, res) => {
  const videoFile = req.file;
  const flipType = req.body.flipType || "horizontal";
  const outputFileName = `flipped_${Date.now()}.mp4`;
  const outputPath = path.join(__dirname, "..", "uploads", outputFileName);

  if (!videoFile) {
    return res.status(400).send("No video file uploaded.");
  }

  let filter = "";
  if (flipType === "horizontal") {
    filter = "hflip";
  } else if (flipType === "vertical") {
    filter = "vflip";
  } else {
    return res
      .status(400)
      .send('Invalid flipType. Use "horizontal" or "vertical".');
  }

  ffmpeg(videoFile.path)
    .videoFilters(filter)
    .on("end", () => {
      fs.readFile(outputPath, (err, data) => {
        if (err) {
          console.error("Error reading flipped video file:", err);
          return res.status(500).send("Error reading flipped video file.");
        }

        res.setHeader("Content-Type", "video/mp4");
        res.setHeader(
          "Content-Disposition",
          `attachment; filename=${outputFileName}`
        );

        res.send(data);

        fs.unlink(videoFile.path, (unlinkErr) => {
          if (unlinkErr) {
            console.error("Error removing original video file:", unlinkErr);
          }
        });

        fs.unlink(outputPath, (unlinkErr) => {
          if (unlinkErr) {
            console.error("Error removing flipped video file:", unlinkErr);
          }
        });
      });
    })
    .on("error", (err) => {
      console.error("Error during video processing:", err);
      res.status(500).send("Error flipping video.");
    })
    .save(outputPath);
});

router.post("/resize-video", upload.single("video"), (req, res) => {
  const videoFile = req.file;
  const width = req.body.width || 1280;
  const height = req.body.height || 720;
  const outputFileName = `resized_${Date.now()}.mp4`;
  const outputPath = path.join(__dirname, "..", "uploads", outputFileName);

  if (!videoFile) {
    return res.status(400).send("No video file uploaded.");
  }

  ffmpeg(videoFile.path)
    .size(`${width}x${height}`)
    .on("end", () => {
      fs.readFile(outputPath, (err, data) => {
        if (err) {
          console.error("Error reading resized video file:", err);
          return res.status(500).send("Error reading resized video file.");
        }

        res.setHeader("Content-Type", "video/mp4");
        res.setHeader(
          "Content-Disposition",
          `attachment; filename=${outputFileName}`
        );

        res.send(data);

        fs.unlink(videoFile.path, (unlinkErr) => {
          if (unlinkErr) {
            console.error("Error removing original video file:", unlinkErr);
          }
        });

        fs.unlink(outputPath, (unlinkErr) => {
          if (unlinkErr) {
            console.error("Error removing resized video file:", unlinkErr);
          }
        });
      });
    })
    .on("error", (err) => {
      console.error("Error during video resizing:", err);
      res.status(500).send("Error resizing video.");
    })
    .save(outputPath);
});

// router.js
router.post("/loop-video", upload.single("video"), (req, res) => {
  const videoFile = req.file;
  const loopCount = parseInt(req.body.loopCount, 10) || 1;
  const outputFileName = `looped_${Date.now()}.mp4`;
  const outputPath = path.join(__dirname, "../uploads", outputFileName);

  if (!videoFile) {
    return res.status(400).send("No video file uploaded.");
  }

  ffmpeg(videoFile.path)
    .inputOptions("-stream_loop", loopCount - 1)
    .on("end", () => {
      res.download(outputPath, outputFileName, (err) => {
        if (err) {
          console.error("Error sending file:", err);
          return res.status(500).send("Error downloading the video.");
        }

        fs.unlink(videoFile.path, (unlinkErr) => {
          if (unlinkErr)
            console.error("Error removing original file:", unlinkErr);
        });
        fs.unlink(outputPath, (unlinkErr) => {
          if (unlinkErr)
            console.error("Error removing looped file:", unlinkErr);
        });
      });
    })
    .on("error", (err) => {
      console.error("Error:", err);
      res.status(500).send("Error processing the video.");
    })
    .save(outputPath);
});

router.post("/change-video-volume", upload.single("video"), (req, res) => {
  const videoFile = req.file;
  const volume = parseFloat(req.body.volume) || 1;
  const outputFileName = `volume_changed_${Date.now()}.mp4`;
  const outputPath = path.join(__dirname, "uploads", outputFileName);

  if (!videoFile) {
    return res.status(400).send("No video file uploaded.");
  }

  ffmpeg(videoFile.path)
    .audioFilters(`volume=${volume}`)
    .on("end", () => {
      res.download(outputPath, outputFileName, (err) => {
        if (err) {
          console.error("Error sending file:", err);
          return res.status(500).send("Error downloading the video.");
        }

        fs.unlink(videoFile.path, (unlinkErr) => {
          if (unlinkErr)
            console.error("Error removing original file:", unlinkErr);
        });
        fs.unlink(outputPath, (unlinkErr) => {
          if (unlinkErr)
            console.error("Error removing processed file:", unlinkErr);
        });
      });
    })
    .on("error", (err) => {
      console.error("Error:", err);
      res.status(500).send("Error processing the video.");
    })
    .save(outputPath);
});

router.post("/change-video-speed", upload.single("video"), (req, res) => {
  const videoFile = req.file;
  const speed = parseFloat(req.body.speed);
  const outputFileName = `speed_changed_${Date.now()}.mp4`;
  const outputPath = path.join(__dirname, "../uploads", outputFileName);

  if (!videoFile) {
    return res.status(400).send("No video file uploaded.");
  }

  if (!speed || speed <= 0) {
    return res.status(400).send("Invalid speed value.");
  }

  ffmpeg(videoFile.path)
    .videoFilters(`setpts=${1 / speed}*PTS`)
    .on("end", () => {
      fs.readFile(outputPath, (err, data) => {
        if (err) {
          console.error("Error reading the file:", err);
          return res.status(500).send("Error reading file.");
        }

        res.setHeader("Content-Type", "video/mp4");
        res.setHeader(
          "Content-Disposition",
          `attachment; filename=${outputFileName}`
        );
        res.send(data);

        fs.unlink(videoFile.path, (unlinkErr) => {
          if (unlinkErr)
            console.error("Error removing original file:", unlinkErr);
        });
        fs.unlink(outputPath, (unlinkErr) => {
          if (unlinkErr)
            console.error("Error removing processed file:", unlinkErr);
        });
      });
    })
    .on("error", (err) => {
      console.error("Error processing video:", err);
      res.status(500).send("Error processing video.");
    })
    .save(outputPath);
});

router.post("/merge-videos", upload.array("videos", 2), (req, res) => {
  if (!req.files || req.files.length < 2) {
    return res.status(400).send("At least two video files are required.");
  }

  const [video1, video2] = req.files;
  const video1Path = video1.path;
  const video2Path = video2.path;
  const outputFilePath = path.join(__dirname, "../uploads", "merged_video.mp4");

  ffmpeg()
    .addInput(video1Path)
    .addInput(video2Path)
    .on("error", (err) => {
      console.error("Error while merging videos:", err);
      res.status(500).send("An error occurred while merging the videos.");
    })
    .on("end", () => {
      res.download(outputFilePath, "merged_video.mp4", (err) => {
        if (err) {
          console.error("Error while sending merged video:", err);
        }

        try {
          fs.unlinkSync(video1Path);
          fs.unlinkSync(video2Path);
          fs.unlinkSync(outputFilePath);
        } catch (cleanupErr) {
          console.error("Error while cleaning up files:", cleanupErr);
        }
      });
    })
    .mergeToFile(outputFilePath);
});

module.exports = router;
