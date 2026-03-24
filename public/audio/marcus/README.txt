Custom Marcus Williams Voice Recordings
========================================

Drop MP3 files here to replace AI-generated patient audio
for Marcus Williams in the scripted demo.

File naming convention:
  marcus-response-1.mp3  — First patient line in scripted transcript
  marcus-response-2.mp3  — Second patient line
  marcus-response-3.mp3  — Third patient line
  (etc.)

Format requirements:
  - MP3, 44.1kHz or 16kHz, mono or stereo
  - Keep each file under 30 seconds
  - Match the transcript text in MARCUS_VOICE_TRANSCRIPT (src/App.jsx)

How it works:
  - Set USE_CUSTOM_MARCUS_AUDIO=true in your .env.local
  - The frontend checks /audio/marcus/marcus-response-N.mp3 for each
    patient line before falling back to TTS-generated audio.
  - AI lines always use the TTS provider.

To record on Mac:
  - Open Voice Memos or QuickTime Player
  - Record each line separately
  - Export as MP3 and rename to match the convention above
