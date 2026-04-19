# Portfolio Backend — Enquiry Email Server

Node.js + Express backend that receives form submissions from your portfolio and sends emails via Gmail.

## Setup

```bash
cd portfolio-backend
npm install
cp .env.example .env
# Edit .env and fill in your GMAIL_USER and GMAIL_PASS
node server.js
```

## Getting a Gmail App Password

1. Go to [myaccount.google.com/security](https://myaccount.google.com/security)
2. Enable **2-Step Verification**
3. Search for **App Passwords**
4. Create one → select **Mail** → copy the 16-character code
5. Paste it as `GMAIL_PASS` in your `.env` file

## API

### `POST /api/enquiry`

**Body (JSON):**
```json
{
  "name": "Jane Smith",
  "email": "jane@example.com",
  "subject": "Freelance project",
  "message": "Hey Abhinav, I'd love to work with you on..."
}
```

**Success response:**
```json
{ "success": true, "message": "Emails sent." }
```

On success, **two emails** are sent:
- One to **you** (Abhinav) with the enquiry details and reply-to set to the sender
- One **auto-reply** to the sender confirming receipt

## Deploying to Production

The easiest free option is **Render** (same as your other projects):

1. Push this folder to a GitHub repo
2. Create a new **Web Service** on Render, connect the repo
3. Set environment variables in the Render dashboard (GMAIL_USER, GMAIL_PASS, FRONTEND_ORIGIN)
4. Update the `fetch` URL in `index.html` from `http://localhost:3001` to your Render URL

### Health check
```
GET /health → { "status": "ok" }
```
