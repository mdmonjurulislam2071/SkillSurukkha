const fs = require("fs/promises");
const path = require("path");
const { execFile } = require("child_process");
const { promisify } = require("util");
const pool = require("../config/db");
const notify = require("./notifications");

const run = promisify(execFile);
const ffmpeg = () => process.env.FFMPEG_PATH || "ffmpeg";
const ffprobe = () => process.env.FFPROBE_PATH || "ffprobe";

async function toolAvailable(command) {
  try {
    await run(command, ["-version"], { windowsHide: true });
    return true;
  } catch {
    return false;
  }
}

async function getPipelineHealth() {
  return {
    ffmpeg: await toolAvailable(ffmpeg()),
    ffprobe: await toolAvailable(ffprobe()),
    huggingFaceToken: Boolean(process.env.HF_TOKEN),
    asrModel: process.env.HF_ASR_MODEL || "openai/whisper-large-v3",
  };
}

async function probeMedia(videoPath) {
  const { stdout } = await run(ffprobe(), ["-v", "quiet", "-print_format", "json", "-show_format", "-show_streams", videoPath], { windowsHide: true, maxBuffer: 2 * 1024 * 1024 });
  const media = JSON.parse(stdout);
  const duration = Number(media.format?.duration || 0);
  const streams = media.streams || [];
  return {
    durationSeconds: duration,
    sizeBytes: Number(media.format?.size || 0),
    format: media.format?.format_name || null,
    hasVideo: streams.some((stream) => stream.codec_type === "video"),
    hasAudio: streams.some((stream) => stream.codec_type === "audio"),
    videoCodec: streams.find((stream) => stream.codec_type === "video")?.codec_name || null,
    audioCodec: streams.find((stream) => stream.codec_type === "audio")?.codec_name || null,
  };
}

async function transcribe(videoPath) {
  if (!process.env.HF_TOKEN) throw new Error("HF_TOKEN is not configured.");
  const audioPath = `${videoPath}.wav`;
  try {
    await run(ffmpeg(), ["-y", "-i", videoPath, "-vn", "-ac", "1", "-ar", "16000", "-f", "wav", audioPath], { windowsHide: true, maxBuffer: 2 * 1024 * 1024 });
    const { InferenceClient } = await import("@huggingface/inference");
    const client = new InferenceClient(process.env.HF_TOKEN);
    const audio = await fs.readFile(audioPath);
    const result = await client.automaticSpeechRecognition({
      model: process.env.HF_ASR_MODEL || "openai/whisper-large-v3",
      inputs: new Blob([audio], { type: "audio/wav" }),
      provider: "hf-inference",
    });
    return result.text?.trim() || "";
  } finally {
    await fs.rm(audioPath, { force: true });
  }
}

function buildEvidence(metadata, transcript) {
  const words = transcript.split(/\s+/).filter(Boolean).length;
  const issues = [];
  if (!metadata.hasVideo) issues.push("No video stream detected.");
  if (!metadata.hasAudio) issues.push("No audio stream detected.");
  if (!metadata.durationSeconds || metadata.durationSeconds > 300) issues.push("Video duration must be between 1 second and 5 minutes.");
  if (words < 10) issues.push("The explanation transcript is too short for a strong preliminary assessment.");
  const authenticityScore = Math.max(0, 100 - issues.length * 25);
  const explanationScore = Math.min(100, words * 2);
  const preliminaryScore = Math.round(authenticityScore * 0.6 + explanationScore * 0.4);
  return {
    preliminaryScore,
    report: {
      checkLevel: "basic_metadata_and_transcript",
      requiresHumanReview: true,
      authenticityScore,
      explanationScore,
      transcriptWordCount: words,
      passed: issues.length === 0,
      issues,
      note: "This MVP report is not a deepfake detector and does not independently prove skill quality.",
    },
  };
}

async function analyzeVerification(verificationId) {
  const [rows] = await pool.query(`SELECT * FROM skill_verifications WHERE id = ?`, [verificationId]);
  const verification = rows[0];
  if (!verification?.video_path) throw new Error("Verification video not found.");
  await pool.query(`UPDATE skill_verifications SET status = 'processing', analysis_error = NULL WHERE id = ?`, [verificationId]);
  try {
    const metadata = await probeMedia(path.resolve(verification.video_path));
    if (!metadata.hasVideo || !metadata.hasAudio || !metadata.durationSeconds || metadata.durationSeconds > 300) {
      throw new Error("Video must contain audio and video streams and be no longer than 5 minutes.");
    }
    const transcript = await transcribe(path.resolve(verification.video_path));
    const evidence = buildEvidence(metadata, transcript);
    await pool.query(
      `UPDATE skill_verifications SET status = 'review_ready', ai_score = ?, transcript = ?, media_metadata = ?, authenticity_report = ?, analyzed_at = NOW() WHERE id = ?`,
      [evidence.preliminaryScore, transcript, JSON.stringify(metadata), JSON.stringify(evidence.report), verificationId]
    );
    await notify(pool, verification.freelancer_id, "skill_analysis_ready", "Skill analysis ready", "Your skill video analysis is ready for review.", { verificationId });
  } catch (error) {
    await pool.query(`UPDATE skill_verifications SET status = 'failed', analysis_error = ?, analyzed_at = NOW() WHERE id = ?`, [error.message, verificationId]);
    throw error;
  }
}

module.exports = { analyzeVerification, getPipelineHealth };
