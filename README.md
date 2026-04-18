# crtfy student Prototype

A React + Vite prototype that reimagines transcript operations around the student rather than the document.

## Concept

The prototype introduces a student-centered experience with:

- A command center dashboard focused on useful operational signals
- A canonical student record that aggregates every transcript upload
- Timeline-based transcript lineage and workflow visibility
- A workflow / trust queue that still preserves student context
- Mock data to demonstrate transfer, freshman, and exception scenarios

## Suggested product direction

- New product name: **crtfy student**
- Design language: deep navy foundation with electric indigo, teal, violet, amber, and rose accents
- IA principle: start from the student, drill into transcripts as supporting evidence

## Run locally

```bash
npm install
npm run dev
```

## Environment

Create a local `.env` with:

```bash
VITE_API_URL=http://127.0.0.1:8000
```

For AWS Amplify, set the environment variable named `VITE_API_URL` to your deployed backend base URL, for example:

```bash
VITE_API_URL=https://api.example.com
```

## Build

```bash
npm run build
```


## Prototype positioning

This prototype is designed around a strategy for beating traditional higher-ed CRMs by competing above them:

- Pre-application transcript intelligence
- Explainable decision packets
- Trust-first document review
- Certified connectors into SIS/CRM systems
- Outcome agents tied to KPIs
