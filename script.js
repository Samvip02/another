document.getElementById('recordButton').addEventListener('click', async () => {
    try {
        if (isRecording) {
            mediaRecorder.stop();
            document.getElementById('recordButton').innerText = 'Record';
        } else {
            audioChunks = [];
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                mediaRecorder = new MediaRecorder(stream);
                mediaRecorder.start();

                mediaRecorder.addEventListener('dataavailable', event => {
                    audioChunks.push(event.data);
                });

                mediaRecorder.addEventListener('stop', async () => {
                    const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
                    try {
                        const response = await fetch('/upload-audio', {
                            method: 'POST',
                            body: audioBlob,
                            headers: {
                                'Content-Type': 'audio/wav'
                            }
                        });

                        if (!response.ok) throw new Error('Network response was not ok.');

                        const data = await response.json();
                        console.log('Transcription and time format:', data);
                    } catch (error) {
                        console.error('Error during audio upload or processing:', error);
                        alert('Failed to process the audio. Please try again.');
                    }
                });

                document.getElementById('recordButton').innerText = 'Stop';
            } catch (err) {
                console.error('Error accessing microphone:', err);
                alert('Microphone access is required to use this feature.');
            }
        }
        isRecording = !isRecording;
    } catch (error) {
        console.error('Unexpected error during recording process:', error);
        alert('An unexpected error occurred. Please refresh the page and try again.');
    }
});
const express = require('express');
const multer = require('multer');
const fs = require('fs');
const OpenAI = require('openai');

// Initialize OpenAI with your API key
const openai = new OpenAI({
  apiKey: 'sk-proj-mAxzAENG2n8NapoT6DCET3BlbkFJgY0ZXHhdAwCoB3vYkZ8f'
});

const app = express();
const upload = multer({ dest: 'uploads/', limits: { fileSize: 10 * 1024 * 1024 } });

app.post('/upload-audio', upload.single('file'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded or file is too large.' });
    }

    const audioFilePath = req.file.path;

    try {
        // Create a readable stream from the file path
        const fileStream = fs.createReadStream(audioFilePath);

        // Transcribe the audio using Whisper AI
        const transcription = await openai.audio.transcriptions.create({
            file: fileStream,
            model: "whisper-1",
            response_format: "text"
        });

        // Respond with the transcription result
        res.json({ transcription: transcription.text });

    } catch (error) {
        console.error('Error during transcription:', error.response ? error.response.data : error.message);
        res.status(500).json({ error: 'Failed to process the audio. Please try again.' });
    } finally {
        // Clean up the uploaded file
        fs.unlink(audioFilePath, (err) => {
            if (err) console.error('Error deleting file:', err);
        });
    }
});

app.listen(3000, () => {
    console.log('Server running on port 3000');
});
