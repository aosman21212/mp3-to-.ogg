const express = require('express');
const axios = require('axios');
const fs = require('fs');
const ffmpeg = require('fluent-ffmpeg');

const path = require('path');
const ExcelJS = require('exceljs'); // Import exceljs for working with Excel files

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware to handle JSON bodies
app.use(express.json());
// Route for file conversion
app.post('/convert', (req, res) => {
  // Check if directory is provided in the request
  if (!req.body || !req.body.directory) {
    return res.status(400).json({ error: 'Please provide a directory to convert' });
  }

  // Input directory path
  const inputDirectory = req.body.directory;

  // Output directory
  const outputDirectory = 'C:\\Users\\a.osman\\Desktop\\node js\\file-upload-api\\output';

  // Ensure the output directory exists, create it if it doesn't
  if (!fs.existsSync(outputDirectory)){
    fs.mkdirSync(outputDirectory, { recursive: true });
  }

  // Read all files in the input directory
  fs.readdir(inputDirectory, (err, files) => {
    if (err) {
      console.error('Error reading directory:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }

    // Filter files with .mp3 extension
    const mp3Files = files.filter(file => path.extname(file).toLowerCase() === '.mp3');

    // Convert each .mp3 file to .ogg
    mp3Files.forEach(mp3File => {
      const inputFilePath = path.join(inputDirectory, mp3File);
      const outputFilePath = path.join(outputDirectory, `${path.parse(mp3File).name}.ogg`);

      // Build the FFMPEG command for each file
      ffmpeg(inputFilePath)
        .outputOptions('-c:a libvorbis') // Set audio codec to libvorbis for OGG
        .output(outputFilePath)
        .on('end', () => {
          console.log(`Conversion of ${mp3File} finished successfully`);
        })
        .on('error', err => {
          console.error(`Error converting ${mp3File}:`, err);
        })
        .run();
    });

    res.json({ message: 'Conversion started for all .mp3 files in the directory' });
  });
});


// Route for transcribing audio
// Route for transcribing audio and saving responses to Excel
app.post('/transcribe', async (req, res) => {
  // Set the directory where the .ogg files are located
  const directory = 'C:\\Users\\a.osman\\Desktop\\node js\\file-upload-api\\output';

  try {
    // Read all files in the specified directory
    fs.readdir(directory, async (err, files) => {
      if (err) {
        console.error('Error reading directory:', err);
        return res.status(500).json({ error: 'Internal server error' });
      }

      // Filter files with .ogg extension
      const oggFiles = files.filter(file => path.extname(file).toLowerCase() === '.ogg');

      // Create a new Excel workbook
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Transcription Responses');

      // Add headers to the worksheet
      worksheet.addRow(['File', 'Transcription']);

      // Transcribe each .ogg file
      for (const file of oggFiles) {
        // Construct the URL of the .ogg file
        const audioUrl = path.join(directory, file);

        // Make a POST request to transcribe the audio using the URL
        const response = await axios.post('https://vertex-stt-backend-globatel-test-fxudoqoheq-ww.a.run.app/transcribe', {
          url: audioUrl
        }, {
          headers: {
            'X-API-KEY': 'BABBABBAB123', // Replace with your API key
            'Content-Type': 'application/json'
          }
        });

        // Log the transcription result
        console.log(`Transcription result for ${file}:`, response.data);

        // Add the transcription response to the Excel worksheet
        worksheet.addRow([file, response.data]);
      }

      // Save the workbook to a file
      const excelFilePath = 'transcription_responses.xlsx';
      await workbook.xlsx.writeFile(excelFilePath);

      // Send the Excel file as a response
      res.download(excelFilePath);

      // Delete the Excel file after sending it
      fs.unlinkSync(excelFilePath);
    });
  } catch (error) {
    console.error('Error transcribing audio:', error);
    res.status(500).json({ error: 'Error transcribing audio' });
  }
});



// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
