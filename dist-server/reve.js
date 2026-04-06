/** Reve `create-image` via AI/ML API (aimlapi.com). */
const AIML_IMAGE_URL = "https://api.aimlapi.com/v1/images/generations";
const REVE_ASPECT = new Set([
    "16:9",
    "9:16",
    "3:2",
    "2:3",
    "4:3",
    "3:4",
    "1:1",
]);
export async function reveCreateImage(opts) {
    const body = {
        model: "reve/create-image",
        prompt: opts.prompt,
        convert_base64_to_url: true,
    };
    if (typeof opts.aspect_ratio === "string" &&
        REVE_ASPECT.has(opts.aspect_ratio)) {
        body.aspect_ratio = opts.aspect_ratio;
    }
    const r = await fetch(AIML_IMAGE_URL, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${opts.apiKey}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
    });
    const raw = (await r.json());
    if (!r.ok) {
        let err = r.statusText;
        if (raw && typeof raw === "object") {
            const e = raw.error;
            if (typeof e === "string")
                err = e;
            else if (e && typeof e === "object" && "message" in e) {
                err = String(e.message);
            }
        }
        throw new Error(err || `AIML API error (${r.status})`);
    }
    const data = raw.data;
    if (!Array.isArray(data) || !data[0] || typeof data[0] !== "object") {
        throw new Error("Reve returned an unexpected response");
    }
    const first = data[0];
    const url = first.url;
    if (!url) {
        throw new Error("Reve returned no image URL");
    }
    return {
        url,
        requestId: typeof first.request_id === "string" ? first.request_id : undefined,
    };
}
