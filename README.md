# SkillShurokkha

Backend-driven freelance marketplace UI with role-based access for admins, freelancers and clients.

## Stack

- Frontend: Next.js, JavaScript, Tailwind CSS
- Backend: Node.js, Express.js
- Database: MySQL

## Environment

Database credentials and secrets live in `backend/.env`. Update at least:

```env
DB_HOST=localhost
DB_PORT=3306
DB_NAME=skillshurokkha
DB_USER=root
DB_PASSWORD=
JWT_SECRET=replace-with-a-long-random-secret
```

Frontend API configuration lives in `frontend/.env.local`.

## Run

```bash
cd backend
npm install
npm run dev
```

```bash
cd frontend
npm install
npm run dev
```

The backend creates the MySQL database and tables at startup if the configured MySQL user has permission.

## Verification delivery

Local development uses `OTP_DEV_MODE=true`. Email and mobile OTP codes are printed by the backend and returned to the registration UI for testing.

Before production:

- Set `OTP_DEV_MODE=false`.
- Configure the SMTP settings in `backend/.env` for email verification.
- Add an SMS provider adapter in `backend/src/services/verification.js` and configure its credentials in `backend/.env`.
- Replace `JWT_SECRET`.

## Roles

- `freelancer`: editable rich profile, profile picture, skills, rate, availability, project applications
- `client`: editable profile, company information, project creation
- `admin`: user overview and protected administration APIs

Set `ADMIN_EMAIL` and `ADMIN_PASSWORD` in `backend/.env` to seed the initial admin account at backend startup.

You can also seed or update the admin explicitly:

```bash
cd backend
npm run seed:admin
```

## Backend APIs

- `/api/auth`: registration, OTP/email verification, resend verification, login and current user
- `/api/profiles`: public profiles, editable freelancer/client profiles and profile picture upload
- `/api/projects`: project creation, applications, shortlist, escrow funding, hire, submissions, revisions and approval
- `/api/skills`: freelancer skill verification submissions, public badges and admin AI-score review
- `/api/notifications`: user notification list and read state
- `/api/payments`: role-aware escrow and released-payment history
- `/api/admin`: user moderation, platform overview and pending skill reviews

Escrow gateway funding is represented by a validated transaction reference in the MVP. Connect the selected payment provider webhook before production payment processing.

Overdue projects are detected by a background deadline sync. Clients can extend the deadline, request an explanation, cancel and refund a funded escrow when no work was submitted, or open a dispute. Submitted-work refund requests go through an administrator dispute resolution instead of an automatic refund.

Project messaging uses authenticated Socket.IO connections. A realtime conversation is created after a client hires a freelancer. Messages are persisted in MySQL and support unread counts, typing indicators and sent/seen state.

## Hosted AI Video Pipeline

Skill verification videos can be uploaded with `POST /api/skills/upload`. The backend:

1. Stores the uploaded MP4, MOV or WEBM file.
2. Reads media metadata with FFprobe and enforces the 5-minute limit.
3. Extracts mono audio with FFmpeg.
4. Sends audio to Hugging Face hosted inference using `openai/whisper-large-v3`, then falls back to a local Whisper model if hosted inference is unavailable or out of credits.
5. Stores the transcript, media metadata, basic authenticity report and preliminary score.
6. Moves the submission to `review_ready` for admin review and badge issuance.

Configure:

```env
HF_TOKEN=
HF_ASR_MODEL=openai/whisper-large-v3
SKILL_TRANSCRIPTION_PROVIDERS=huggingface,local
WHISPER_COMMAND=whisper
WHISPER_COMMAND_ARGS=
WHISPER_MODEL=base
WHISPER_MODEL_DIR=
WHISPER_LANGUAGE=en
FFMPEG_PATH=ffmpeg
FFPROBE_PATH=ffprobe
SKILL_VIDEO_MAX_MB=150
```

Use `GET /api/skills/pipeline-health` as an admin to verify configuration. Install FFmpeg on the host and set `HF_TOKEN` before enabling hosted analysis. For the local Whisper fallback, install the Whisper CLI with Python and make sure `WHISPER_COMMAND` is available on the backend process path. If Hugging Face credits are exhausted, the backend automatically tries the local Whisper provider before sending the submission to manual review.

The MVP authenticity report checks media structure, duration and explanation evidence. It is intentionally not described as a deepfake detector or as a fully autonomous proof of skill quality. Admin review remains required before issuing a badge.

Run the disposable upload-pipeline integration test with:

```bash
cd backend
npm run test:ai-upload
```

## AI project requirement review

Clients define one acceptance requirement per line when creating a project. A hired freelancer can submit a ZIP source archive, repository URL, live demo URL and implementation notes. The backend safely inspects text source files without executing the project and creates a requirement-by-requirement report.

Configure `OPENAI_API_KEY` to use the OpenAI Responses API with structured output. `OPENAI_PROJECT_REVIEW_MODEL` defaults to `gpt-5.5`. A score above 50% creates a requirement-match badge and sends the version to client review. A score above 70% additionally starts a 24-hour dispute hold; if no dispute is opened, 90% of escrow is released to the freelancer wallet. Client approval releases all remaining escrow to the freelancer.

Every resubmission is stored as an immutable numbered version. Revision requests must cite original requirements and include an issue, expected result and evidence. Once completed, the client can download any archived version. Freelancers can request wallet withdrawals through bank, bKash, Nagad, Rocket, PayPal or Wise; administrators record the external payout reference.
