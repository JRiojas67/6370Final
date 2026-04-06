import "dotenv/config";
import express from "express";
import cors from "cors";
import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import { fal } from "@fal-ai/client";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { BEAN_SYSTEM, IMAGE_PROMPT_SYSTEM } from "./personality.js";
import { reveCreateImage } from "./reve.js";
const PORT = Number(process.env.PORT) || 3001;
const OPENAI_MODEL = process.env.OPENAI_MODEL ?? "gpt-4o-mini";
const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL ?? "claude-3-5-sonnet-20241022";
const openaiKey = process.env.OPENAI_API_KEY;
const anthropicKey = process.env.ANTHROPIC_API_KEY;
const falKey = process.env.FAL_KEY;
const aimlApiKey = process.env.AIMLAPI_KEY;
const openai = openaiKey ? new OpenAI({ apiKey: openaiKey }) : null;
const anthropic = anthropicKey ? new Anthropic({ apiKey: anthropicKey }) : null;
if (falKey) {
    fal.config({ credentials: falKey });
}
function normalizeMessages(raw) {
    if (!Array.isArray(raw))
        return [];
    const out = [];
    for (const m of raw) {
        if (m &&
            typeof m === "object" &&
            "role" in m &&
            "content" in m &&
            typeof m.content === "string") {
            const role = m.role;
            if (role === "user" || role === "assistant" || role === "system") {
                out.push({ role, content: m.content });
            }
        }
    }
    return out;
}
function toAnthropicMessages(messages) {
    const withoutSystem = messages.filter((m) => m.role !== "system");
    const result = [];
    for (const m of withoutSystem) {
        if (m.role !== "user" && m.role !== "assistant")
            continue;
        const last = result[result.length - 1];
        if (last && last.role === m.role) {
            const prev = typeof last.content === "string"
                ? last.content
                : JSON.stringify(last.content);
            last.content = `${prev}\n\n${m.content}`;
        }
        else {
            result.push({ role: m.role, content: m.content });
        }
    }
    return result;
}
const app = express();
app.use(cors());
app.use(express.json({ limit: "2mb" }));
app.get("/api/health", (_req, res) => {
    res.json({
        openai: Boolean(openai),
        anthropic: Boolean(anthropic),
        fal: Boolean(falKey),
        reve: Boolean(aimlApiKey),
    });
});
app.post("/api/chat", async (req, res) => {
    try {
        const provider = req.body?.provider;
        const messages = normalizeMessages(req.body?.messages);
        if (!messages.length) {
            res.status(400).json({ error: "messages required" });
            return;
        }
        if (provider === "openai") {
            if (!openai) {
                res.status(503).json({ error: "OpenAI API key not configured" });
                return;
            }
            const openaiMessages = [
                { role: "system", content: BEAN_SYSTEM },
                ...messages
                    .filter((m) => m.role !== "system")
                    .map((m) => ({
                    role: m.role,
                    content: m.content,
                })),
            ];
            const completion = await openai.chat.completions.create({
                model: OPENAI_MODEL,
                messages: openaiMessages,
                temperature: 0.7,
            });
            const text = completion.choices[0]?.message?.content ?? "";
            res.json({ role: "assistant", content: text });
            return;
        }
        if (provider === "anthropic") {
            if (!anthropic) {
                res.status(503).json({ error: "Anthropic API key not configured" });
                return;
            }
            const anthropicMessages = toAnthropicMessages(messages);
            const msg = await anthropic.messages.create({
                model: ANTHROPIC_MODEL,
                max_tokens: 4096,
                system: BEAN_SYSTEM,
                messages: anthropicMessages,
            });
            const block = msg.content.find((b) => b.type === "text");
            const text = block && block.type === "text" ? block.text : "";
            res.json({ role: "assistant", content: text });
            return;
        }
        res.status(400).json({ error: "provider must be openai or anthropic" });
    }
    catch (e) {
        const message = e instanceof Error ? e.message : "Chat failed";
        res.status(500).json({ error: message });
    }
});
app.post("/api/creativity", async (req, res) => {
    try {
        const provider = req.body?.provider;
        const idea = typeof req.body?.idea === "string" ? req.body.idea.trim() : "";
        if (!idea) {
            res.status(400).json({ error: "idea required" });
            return;
        }
        const userContent = `Turn this into one rich image prompt:\n\n${idea}`;
        if (provider === "openai") {
            if (!openai) {
                res.status(503).json({ error: "OpenAI API key not configured" });
                return;
            }
            const completion = await openai.chat.completions.create({
                model: OPENAI_MODEL,
                messages: [
                    { role: "system", content: IMAGE_PROMPT_SYSTEM },
                    { role: "user", content: userContent },
                ],
                temperature: 0.85,
            });
            const prompt = completion.choices[0]?.message?.content?.trim() ?? "";
            res.json({ prompt });
            return;
        }
        if (provider === "anthropic") {
            if (!anthropic) {
                res.status(503).json({ error: "Anthropic API key not configured" });
                return;
            }
            const msg = await anthropic.messages.create({
                model: ANTHROPIC_MODEL,
                max_tokens: 2048,
                system: IMAGE_PROMPT_SYSTEM,
                messages: [{ role: "user", content: userContent }],
            });
            const block = msg.content.find((b) => b.type === "text");
            const prompt = block && block.type === "text" ? block.text.trim() : "";
            res.json({ prompt });
            return;
        }
        res.status(400).json({ error: "provider must be openai or anthropic" });
    }
    catch (e) {
        const message = e instanceof Error ? e.message : "Creativity failed";
        res.status(500).json({ error: message });
    }
});
app.post("/api/image", async (req, res) => {
    try {
        const prompt = typeof req.body?.prompt === "string" ? req.body.prompt.trim() : "";
        if (!prompt) {
            res.status(400).json({ error: "prompt required" });
            return;
        }
        const engine = req.body?.engine === "reve" ? "reve" : "nano-banana";
        if (engine === "reve") {
            if (!aimlApiKey) {
                res
                    .status(503)
                    .json({
                    error: "AIMLAPI_KEY not configured (Reve via AI/ML API — see .env.example)",
                });
                return;
            }
            const aspect_ratio = req.body?.aspect_ratio;
            const out = await reveCreateImage({
                apiKey: aimlApiKey,
                prompt,
                aspect_ratio: typeof aspect_ratio === "string" ? aspect_ratio : undefined,
            });
            res.json({
                engine: "reve",
                images: [{ url: out.url }],
                description: "",
                requestId: out.requestId,
            });
            return;
        }
        if (!falKey) {
            res.status(503).json({ error: "FAL_KEY not configured (fal.ai)" });
            return;
        }
        const aspect_ratio = req.body?.aspect_ratio;
        const resolution = req.body?.resolution;
        const output_format = req.body?.output_format;
        const num_images = Number(req.body?.num_images) || 1;
        const allowedAspect = new Set([
            "21:9",
            "16:9",
            "3:2",
            "4:3",
            "5:4",
            "1:1",
            "4:5",
            "3:4",
            "2:3",
            "9:16",
        ]);
        const input = {
            prompt,
            num_images: Math.min(4, Math.max(1, num_images)),
        };
        if (typeof aspect_ratio === "string" &&
            allowedAspect.has(aspect_ratio)) {
            input.aspect_ratio = aspect_ratio;
        }
        if (resolution === "1K" || resolution === "2K" || resolution === "4K") {
            input.resolution = resolution;
        }
        if (output_format === "jpeg" ||
            output_format === "png" ||
            output_format === "webp") {
            input.output_format = output_format;
        }
        const result = await fal.subscribe("fal-ai/nano-banana-pro", {
            input,
            logs: false,
        });
        const data = result.data;
        res.json({
            engine: "nano-banana",
            images: data.images ?? [],
            description: data.description ?? "",
            requestId: result.requestId,
        });
    }
    catch (e) {
        const message = e instanceof Error ? e.message : "Image generation failed";
        res.status(500).json({ error: message });
    }
});
const __dirname = path.dirname(fileURLToPath(import.meta.url));
if (process.env.NODE_ENV === "production") {
    const staticDir = path.join(__dirname, "../dist");
    app.use(express.static(staticDir));
    app.get("*", (_req, res) => {
        res.sendFile(path.join(staticDir, "index.html"));
    });
}
app.listen(PORT, () => {
    console.log(`API listening on http://127.0.0.1:${PORT}`);
});
