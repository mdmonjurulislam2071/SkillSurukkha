const fs = require("fs/promises");
const fsSync = require("fs");
const path = require("path");
const { execFile } = require("child_process");
const { promisify } = require("util");
const pool = require("../config/db");
const notify = require("./notifications");

const run = promisify(execFile);
const ffmpeg = () => process.env.FFMPEG_PATH || "ffmpeg";
const ffprobe = () => process.env.FFPROBE_PATH || "ffprobe";
const whisperCommand = () => {
  if (process.env.WHISPER_COMMAND) return process.env.WHISPER_COMMAND;
  const localAppData = process.env.LOCALAPPDATA;
  const windowsWhisper = localAppData ? path.join(localAppData, "Programs", "Python", "Python311", "Scripts", "whisper.exe") : null;
  return windowsWhisper && fsSync.existsSync(windowsWhisper) ? windowsWhisper : "whisper";
};
const whisperCommandArgs = () => String(process.env.WHISPER_COMMAND_ARGS || "").split(/\s+/).filter(Boolean);
const whisperModel = () => process.env.WHISPER_MODEL || "base";
const whisperModelDir = () => process.env.WHISPER_MODEL_DIR || (process.env.LOCALAPPDATA ? path.join(process.env.LOCALAPPDATA, "WhisperModels") : null);

function badgeName(skillName, score) {
  if (Number(score) >= 85) return `${skillName} Elite Expert`;
  if (Number(score) >= 70) return `${skillName} Verified Pro`;
  return `${skillName} Rising Talent`;
}

async function toolAvailable(command) {
  try {
    await run(command, ["-version"], { windowsHide: true });
    return true;
  } catch {
    return false;
  }
}

async function commandAvailable(command, args = ["--help"]) {
  try {
    await run(command, args, { windowsHide: true, maxBuffer: 1024 * 1024, env: { ...process.env, PYTHONIOENCODING: "utf-8" } });
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
    transcriptionProviders: transcriptionProviders(),
    localWhisper: await commandAvailable(whisperCommand(), [...whisperCommandArgs(), "--help"]),
    localWhisperModel: whisperModel(),
    localWhisperModelDir: whisperModelDir(),
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

async function transcribeWithHuggingFace(videoPath) {
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

async function transcribeWithLocalWhisper(videoPath) {
  const audioPath = `${videoPath}.wav`;
  const outputDir = await fs.mkdtemp(path.join(path.dirname(videoPath), "whisper-"));
  try {
    await run(ffmpeg(), ["-y", "-i", videoPath, "-vn", "-ac", "1", "-ar", "16000", "-f", "wav", audioPath], { windowsHide: true, maxBuffer: 2 * 1024 * 1024 });
    const args = [
      ...whisperCommandArgs(),
      audioPath,
      "--model", whisperModel(),
      "--output_format", "txt",
      "--output_dir", outputDir,
      "--fp16", "False",
    ];
    if (whisperModelDir()) args.push("--model_dir", whisperModelDir());
    if (process.env.WHISPER_LANGUAGE) args.push("--language", process.env.WHISPER_LANGUAGE);
    await run(whisperCommand(), args, { windowsHide: true, maxBuffer: 10 * 1024 * 1024, timeout: Number(process.env.WHISPER_TIMEOUT_MS || 10 * 60 * 1000), env: { ...process.env, PYTHONIOENCODING: "utf-8" } });
    const files = await fs.readdir(outputDir);
    const transcriptFile = files.find((file) => file.toLowerCase().endsWith(".txt"));
    if (!transcriptFile) throw new Error("Local Whisper did not create a transcript file.");
    const transcript = await fs.readFile(path.join(outputDir, transcriptFile), "utf8");
    return transcript.trim();
  } finally {
    await fs.rm(audioPath, { force: true });
    await fs.rm(outputDir, { recursive: true, force: true });
  }
}

function transcriptionProviders() {
  return String(process.env.SKILL_TRANSCRIPTION_PROVIDERS || "huggingface,local")
    .split(",")
    .map((provider) => provider.trim().toLowerCase())
    .filter(Boolean);
}

async function transcribe(videoPath) {
  const errors = [];
  for (const provider of transcriptionProviders()) {
    try {
      if (provider === "huggingface" || provider === "hf") return { transcript: await transcribeWithHuggingFace(videoPath), provider: "huggingface" };
      if (provider === "local" || provider === "whisper") return { transcript: await transcribeWithLocalWhisper(videoPath), provider: "local-whisper" };
    } catch (error) {
      errors.push(`${provider}: ${error.message}`);
      if (!isTranscriptionProviderError(error) && provider !== "local" && provider !== "whisper") throw error;
    }
  }
  throw new Error(`All speech transcription providers failed. ${errors.join(" | ")}`);
}

function isTranscriptionProviderError(error) {
  const message = String(error?.message || "");
  return /HF_TOKEN|included credits|Inference Providers|quota|rate limit|unauthorized|forbidden|payment|required|subscribe|billing|not recognized|not found|ENOENT|failed|unavailable/i.test(message);
}

function parseTaskDescription(value) {
  try {
    const parsed = JSON.parse(value || "{}");
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function questionCoverage(taskDescription, transcript) {
  const task = parseTaskDescription(taskDescription);
  const questions = Array.isArray(task.questions) ? task.questions : [];
  const searchable = transcript.toLowerCase();
  return questions.map((item, index) => {
    const question = String(item.question || item).trim();
    const terms = question.toLowerCase().match(/[a-z0-9]{4,}/g) || [];
    const matched = [...new Set(terms.filter((term) => searchable.includes(term)))];
    const score = terms.length ? Math.round((matched.length / terms.length) * 100) : 0;
    return {
      id: Number(item.id || index + 1),
      question,
      score,
      status: score >= 60 ? "covered" : score >= 30 ? "partial" : "weak",
      evidence: matched.slice(0, 8),
    };
  });
}

function buildEvidence(metadata, transcript = "", taskDescription) {
  const words = transcript.split(/\s+/).filter(Boolean).length;
  const issues = [];
  const questionResults = questionCoverage(taskDescription, transcript);
  if (!metadata.hasVideo) issues.push("No video stream detected.");
  if (!metadata.hasAudio) issues.push("No audio stream detected.");
  if (!metadata.durationSeconds || metadata.durationSeconds > 300) issues.push("Video duration must be between 1 second and 5 minutes.");
  if (words < 10) issues.push("The explanation transcript is too short for a strong preliminary assessment.");
  if (questionResults.length === 3 && questionResults.some((item) => item.score < 30)) issues.push("One or more verification questions were not clearly answered in the transcript.");
  const authenticityScore = Math.max(0, 100 - issues.length * 25);
  const explanationScore = Math.min(100, words * 2);
  const questionScore = questionResults.length ? Math.round(questionResults.reduce((sum, item) => sum + item.score, 0) / questionResults.length) : explanationScore;
  const preliminaryScore = Math.round(authenticityScore * 0.35 + explanationScore * 0.25 + questionScore * 0.4);
  return {
    preliminaryScore,
    report: {
      checkLevel: "basic_metadata_and_transcript",
      requiresHumanReview: true,
      authenticityScore,
      explanationScore,
      questionScore,
      questionResults,
      transcriptWordCount: words,
      passed: issues.length === 0,
      issues,
      note: "This MVP report is not a deepfake detector and does not independently prove skill quality.",
    },
  };
}

function buildMetadataOnlyEvidence(metadata, taskDescription, error) {
  const evidence = buildEvidence(metadata, "", taskDescription);
  return {
    preliminaryScore: Math.min(evidence.preliminaryScore, 35),
    report: {
      ...evidence.report,
      checkLevel: "metadata_only_transcription_unavailable",
      requiresHumanReview: true,
      passed: false,
      issues: [
        "Hosted speech transcription is currently unavailable, so this submission needs manual review.",
        ...evidence.report.issues,
      ],
      providerError: String(error?.message || "Transcription provider unavailable.").slice(0, 500),
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
    let transcript = "";
    let evidence;
    try {
      const result = await transcribe(path.resolve(verification.video_path));
      transcript = result.transcript;
      evidence = buildEvidence(metadata, transcript, verification.task_description);
      evidence.report.transcriptionProvider = result.provider;
    } catch (error) {
      if (!isTranscriptionProviderError(error)) throw error;
      evidence = buildMetadataOnlyEvidence(metadata, verification.task_description, error);
    }
    const activationThreshold = Number(process.env.SKILL_ACTIVATION_SCORE || 50);
    const verified = evidence.preliminaryScore >= activationThreshold;
    const badgeReference = verified ? badgeName(verification.skill_name, evidence.preliminaryScore) : null;
    await pool.query(
      `UPDATE skill_verifications
       SET status = ?, ai_score = ?, transcript = ?, media_metadata = ?, authenticity_report = ?,
           badge_reference = ?, reviewed_at = ${verified ? "NOW()" : "NULL"}, analyzed_at = NOW()
       WHERE id = ?`,
      [verified ? "verified" : "review_ready", evidence.preliminaryScore, transcript, JSON.stringify(metadata), JSON.stringify(evidence.report), badgeReference, verificationId]
    );
    await notify(pool, verification.freelancer_id, verified ? "skill_verified" : "skill_analysis_ready", verified ? "Skill verified" : "Skill analysis ready", verified ? `Your ${verification.skill_name} verification scored ${evidence.preliminaryScore}% and your freelancer marketplace account is active.` : `Your skill video scored ${evidence.preliminaryScore}%. Score ${activationThreshold}% or higher to activate project applications.`, { verificationId });
    if (!verified) await notify.role(
      pool,
      "admin",
      "skill_review_ready",
      "Skill analysis ready for review",
      `${verification.skill_name} scored below activation threshold and is ready for administrator review.`,
      { verificationId, route: "dashboard" }
    );
  } catch (error) {
    await pool.query(`UPDATE skill_verifications SET status = 'failed', analysis_error = ?, analyzed_at = NOW() WHERE id = ?`, [error.message, verificationId]);
    throw error;
  }
}

module.exports = { analyzeVerification, getPipelineHealth };
