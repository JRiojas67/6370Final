import { useCallback, useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { CREATIVITY_PROMPTS } from "./creativityPrompts";

type Provider = "openai" | "anthropic";

type Msg = { role: "user" | "assistant"; content: string };

type ImageEngine = "nano-banana" | "reve";

type Health = {
  openai: boolean;
  anthropic: boolean;
  fal: boolean;
  reve: boolean;
};

async function api<T>(path: string, body?: object): Promise<T> {
  const r = await fetch(path, {
    method: body ? "POST" : "GET",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = (await r.json()) as T & { error?: string };
  if (!r.ok) throw new Error((data as { error?: string }).error ?? r.statusText);
  return data as T;
}

function MarkdownBody({ text }: { text: string }) {
  return (
    <div className="msg-md">
    <ReactMarkdown
      components={{
        p: ({ children }) => <p className="md-p">{children}</p>,
        ul: ({ children }) => <ul className="md-ul">{children}</ul>,
        ol: ({ children }) => <ol className="md-ol">{children}</ol>,
        li: ({ children }) => <li className="md-li">{children}</li>,
        strong: ({ children }) => <strong className="md-strong">{children}</strong>,
        h1: ({ children }) => <h3 className="md-h">{children}</h3>,
        h2: ({ children }) => <h3 className="md-h">{children}</h3>,
        h3: ({ children }) => <h3 className="md-h">{children}</h3>,
        code: ({ children }) => (
          <code className="md-code">{children}</code>
        ),
      }}
    >
      {text}
    </ReactMarkdown>
    </div>
  );
}

export default function App() {
  const [provider, setProvider] = useState<Provider>("openai");
  const [health, setHealth] = useState<Health | null>(null);
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: "assistant",
      content:
        "Hi — I'm **BEAn**, your work and creative copilot. Pick **ChatGPT** or **Claude** on the left, ask me anything, and use the **image studio** on the right — **Nano Banana** (fal.ai) or **Reve** (AI/ML API). What are we tackling first?",
    },
  ]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [imagePrompt, setImagePrompt] = useState("");
  const [imageEngine, setImageEngine] = useState<ImageEngine>("nano-banana");
  const [aspectRatio, setAspectRatio] = useState("");
  const [resolution, setResolution] = useState("1K");
  const [imageLoading, setImageLoading] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [creativityLoading, setCreativityLoading] = useState(false);
  const [studioError, setStudioError] = useState<string | null>(null);

  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api<Health>("/api/health")
      .then(setHealth)
      .catch(() => setHealth(null));
  }, []);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const sendChat = useCallback(async () => {
    const text = input.trim();
    if (!text || sending) return;
    setError(null);
    setInput("");
    const prev = messages;
    const next: Msg[] = [...prev, { role: "user", content: text }];
    setMessages(next);
    setSending(true);
    try {
      const res = await api<{ role: string; content: string }>("/api/chat", {
        provider,
        messages: next,
      });
      setMessages([...next, { role: "assistant", content: res.content }]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed");
      setMessages(prev);
    } finally {
      setSending(false);
    }
  }, [input, sending, messages, provider]);

  const expandCreativity = useCallback(async () => {
    const idea = imagePrompt.trim();
    if (!idea) {
      setStudioError("Add a seed idea or pick a creativity prompt first.");
      return;
    }
    setStudioError(null);
    setCreativityLoading(true);
    try {
      const res = await api<{ prompt: string }>("/api/creativity", {
        provider,
        idea,
      });
      setImagePrompt(res.prompt);
    } catch (e) {
      setStudioError(e instanceof Error ? e.message : "Expand failed");
    } finally {
      setCreativityLoading(false);
    }
  }, [imagePrompt, provider]);

  const generateImage = useCallback(async () => {
    const prompt = imagePrompt.trim();
    if (!prompt) {
      setStudioError("Enter an image prompt.");
      return;
    }
    setStudioError(null);
    setImageLoading(true);
    setImageUrl(null);
    try {
      const res = await api<{
        images: { url: string }[];
        description: string;
      }>("/api/image", {
        engine: imageEngine,
        prompt,
        ...(aspectRatio ? { aspect_ratio: aspectRatio } : {}),
        ...(imageEngine === "nano-banana"
          ? { resolution, output_format: "png", num_images: 1 }
          : {}),
      });
      const url = res.images[0]?.url;
      if (url) setImageUrl(url);
      else setStudioError("No image returned.");
    } catch (e) {
      setStudioError(e instanceof Error ? e.message : "Image failed");
    } finally {
      setImageLoading(false);
    }
  }, [imagePrompt, aspectRatio, resolution, imageEngine]);

  const useLastReplyAsPrompt = useCallback(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === "assistant") {
        setImagePrompt(messages[i].content.slice(0, 4000));
        return;
      }
    }
  }, [messages]);

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">B</div>
          <div>
            <h1>BEAn</h1>
            <span>Work & creative copilot</span>
          </div>
        </div>

        <div className="nav-section">
          <p className="nav-label">Model</p>
          <div className="provider-toggle">
            <button
              type="button"
              className={`provider-btn ${provider === "openai" ? "active" : ""}`}
              onClick={() => setProvider("openai")}
            >
              <span className="provider-dot openai" />
              <div>
                ChatGPT
                <small>OpenAI · {health?.openai ? "ready" : "needs key"}</small>
              </div>
            </button>
            <button
              type="button"
              className={`provider-btn ${provider === "anthropic" ? "active" : ""}`}
              onClick={() => setProvider("anthropic")}
            >
              <span className="provider-dot anthropic" />
              <div>
                Claude
                <small>Anthropic · {health?.anthropic ? "ready" : "needs key"}</small>
              </div>
            </button>
          </div>
        </div>

        <div className="status-pill">
          <strong>Personality:</strong> BEAn is warm, direct, and practical — built
          for drafting, planning, and creative direction. Keys stay on the server;
          add <code style={{ fontFamily: "var(--mono)", fontSize: "0.68rem" }}>.env</code>{" "}
          from <code style={{ fontFamily: "var(--mono)", fontSize: "0.68rem" }}>.env.example</code>.
          <br />
          <br />
          <strong>Nano Banana:</strong> {health?.fal ? "fal.ai" : "set FAL_KEY"} ·{" "}
          <strong>Reve:</strong> {health?.reve ? "AI/ML API" : "set AIMLAPI_KEY"}.
        </div>
      </aside>

      <main className="main-column">
        <div className="chat-header">
          <h2>Conversation</h2>
          <span className="pill-quiet">
            {provider === "openai" ? "OpenAI" : "Anthropic"} · same brain, your pick
          </span>
        </div>

        {error && <div className="error-banner">{error}</div>}

        <div className="messages" ref={listRef}>
          {messages.map((m, i) => (
            <div key={i} className={`msg ${m.role}`}>
              <div className="msg-role">{m.role === "user" ? "You" : "BEAn"}</div>
              <div className="msg-body">
                {m.role === "assistant" ? (
                  <MarkdownBody text={m.content} />
                ) : (
                  m.content
                )}
              </div>
            </div>
          ))}
          {sending && (
            <div className="msg assistant">
              <div className="msg-role">BEAn</div>
              <div className="loading-dots" aria-label="Thinking">
                <span />
                <span />
                <span />
              </div>
            </div>
          )}
        </div>

        <div className="composer">
          <textarea
            placeholder="Message BEAn…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void sendChat();
              }
            }}
            rows={2}
          />
          <button type="button" className="btn-primary" disabled={sending || !input.trim()} onClick={() => void sendChat()}>
            Send
          </button>
        </div>
      </main>

      <section className="studio-column">
        <div
          className={
            imageEngine === "reve" ? "reve-badge" : "nano-badge"
          }
        >
          {imageEngine === "reve"
            ? "Reve · AI/ML API"
            : "Nano Banana · fal.ai"}
        </div>
        <h2>Image studio</h2>
        <p className="studio-sub">
          Creativity prompts seed ideas; <strong>Expand with AI</strong> turns them into
          a rich prompt using your selected chat model. Pick an engine, then generate.
        </p>

        <div className="engine-toggle" role="group" aria-label="Image engine">
          <button
            type="button"
            className={`engine-btn ${imageEngine === "nano-banana" ? "active" : ""}`}
            onClick={() => {
              setImageEngine("nano-banana");
              setStudioError(null);
            }}
          >
            Nano Banana
            <small>Google · fal</small>
          </button>
          <button
            type="button"
            className={`engine-btn ${imageEngine === "reve" ? "active" : ""}`}
            onClick={() => {
              setImageEngine("reve");
              setStudioError(null);
            }}
          >
            Reve
            <small>create-image</small>
          </button>
        </div>

        <div className="prompt-chips">
          {CREATIVITY_PROMPTS.map((p) => (
            <button
              key={p.label}
              type="button"
              className="chip"
              onClick={() => {
                setImagePrompt(p.seed);
                setStudioError(null);
              }}
            >
              {p.label}
            </button>
          ))}
        </div>

        <textarea
          className="studio-textarea"
          placeholder="Image prompt or rough idea…"
          value={imagePrompt}
          onChange={(e) => setImagePrompt(e.target.value)}
        />

        <div className="studio-actions">
          <button
            type="button"
            className="btn-accent"
            disabled={creativityLoading}
            onClick={() => void expandCreativity()}
          >
            {creativityLoading ? "Expanding…" : "Expand with AI"}
          </button>
          <button type="button" className="btn-ghost" onClick={useLastReplyAsPrompt}>
            Use last reply
          </button>
          <button
            type="button"
            className="btn-primary"
            disabled={imageLoading}
            onClick={() => void generateImage()}
          >
            {imageLoading ? "Generating…" : "Generate"}
          </button>
        </div>

        <div className="studio-select-row">
          <label>
            Aspect
            <select value={aspectRatio} onChange={(e) => setAspectRatio(e.target.value)}>
              <option value="">
                {imageEngine === "reve" ? "Default (3:2)" : "Default (model)"}
              </option>
              <option value="1:1">1:1</option>
              <option value="16:9">16:9</option>
              <option value="9:16">9:16</option>
              <option value="4:3">4:3</option>
              <option value="3:4">3:4</option>
              <option value="3:2">3:2</option>
              <option value="2:3">2:3</option>
            </select>
          </label>
          <label
            className={
              imageEngine === "reve" ? "label-muted" : undefined
            }
          >
            Resolution
            <select
              value={resolution}
              onChange={(e) => setResolution(e.target.value)}
              disabled={imageEngine === "reve"}
            >
              <option value="1K">1K</option>
              <option value="2K">2K</option>
              <option value="4K">4K</option>
            </select>
            {imageEngine === "reve" && (
              <span className="field-hint">Nano Banana only</span>
            )}
          </label>
        </div>

        {studioError && <div className="error-banner">{studioError}</div>}

        <div className="image-preview">
          {imageUrl ? (
            <img src={imageUrl} alt="Generated" />
          ) : (
            <div className="placeholder">
              {imageLoading
                ? imageEngine === "reve"
                  ? "Rendering with Reve…"
                  : "Rendering with Nano Banana…"
                : "Your image will appear here."}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
