import { env, createExecutionContext, waitOnExecutionContext } from "cloudflare:test";
import { describe, it, expect, vi, afterEach } from "vitest";
import worker from "../src/index";

const IncomingRequest = Request<unknown, IncomingRequestCfProperties>;

function makeFetchSpy(handler: (request: Request) => Promise<Response>) {
	return vi.fn(handler);
}

async function callWorker(request: InstanceType<typeof IncomingRequest>): Promise<Response> {
	const ctx = createExecutionContext();
	const response = await worker.fetch(request, env, ctx);
	await waitOnExecutionContext(ctx);
	return response;
}

describe("gateway worker", () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it("proxies /api/* requests to the API origin, stripping the /api prefix", async () => {
		const fetchSpy = makeFetchSpy(async () => new Response("ok"));
		vi.stubGlobal("fetch", fetchSpy);

		await callWorker(new IncomingRequest("https://gateway.example/api/users"));

		expect(fetchSpy).toHaveBeenCalledTimes(1);
		const forwardedRequest = fetchSpy.mock.calls[0][0];
		expect(forwardedRequest.url).toBe("https://backend.example/users");
	});

	it("adds the gateway secret, overwriting any value the client sent", async () => {
		const fetchSpy = makeFetchSpy(async () => new Response("ok"));
		vi.stubGlobal("fetch", fetchSpy);

		await callWorker(
			new IncomingRequest("https://gateway.example/api/users", {
				headers: { "X-Gateway-Secret": "spoofed" },
			}),
		);

		const forwardedRequest = fetchSpy.mock.calls[0][0];
		expect(forwardedRequest.headers.get("X-Gateway-Secret")).toBe("test-gateway-secret");
	});

	it("forwards the session cookie to the API", async () => {
		const fetchSpy = makeFetchSpy(async () => new Response("ok"));
		vi.stubGlobal("fetch", fetchSpy);

		await callWorker(
			new IncomingRequest("https://gateway.example/api/users", {
				headers: { Cookie: "csr_session=abc123" },
			}),
		);

		const forwardedRequest = fetchSpy.mock.calls[0][0];
		expect(forwardedRequest.headers.get("Cookie")).toBe("csr_session=abc123");
	});

	it("returns the API's Set-Cookie to the browser untouched", async () => {
		const setCookie = "csr_session=abc123; Path=/; HttpOnly; SameSite=Strict";
		vi.stubGlobal(
			"fetch",
			makeFetchSpy(async () => new Response("{}", { headers: { "Set-Cookie": setCookie } })),
		);

		const response = await callWorker(
			new IncomingRequest("https://gateway.example/api/auth/login", { method: "POST" }),
		);

		expect(response.headers.get("Set-Cookie")).toBe(setCookie);
	});

	it("preserves the query string when proxying", async () => {
		const fetchSpy = makeFetchSpy(async () => new Response("ok"));
		vi.stubGlobal("fetch", fetchSpy);

		await callWorker(new IncomingRequest("https://gateway.example/api/users?search=foo&page=2"));

		const forwardedRequest = fetchSpy.mock.calls[0][0];
		expect(forwardedRequest.url).toBe("https://backend.example/users?search=foo&page=2");
	});

	it("treats /api with no further path as the API origin root", async () => {
		const fetchSpy = makeFetchSpy(async () => new Response("ok"));
		vi.stubGlobal("fetch", fetchSpy);

		await callWorker(new IncomingRequest("https://gateway.example/api"));

		const forwardedRequest = fetchSpy.mock.calls[0][0];
		expect(forwardedRequest.url).toBe("https://backend.example/");
	});

	it("forwards the method and body for non-GET requests", async () => {
		const fetchSpy = makeFetchSpy(async () => new Response("ok"));
		vi.stubGlobal("fetch", fetchSpy);

		await callWorker(
			new IncomingRequest("https://gateway.example/api/users/1", {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ name: "Ada" }),
			}),
		);

		const forwardedRequest = fetchSpy.mock.calls[0][0];
		expect(forwardedRequest.method).toBe("PATCH");
		expect(forwardedRequest.headers.get("Content-Type")).toBe("application/json");
		await expect(forwardedRequest.text()).resolves.toBe(JSON.stringify({ name: "Ada" }));
	});

	it("returns the upstream API's status, headers, and body unchanged", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn(
				async () =>
					new Response(JSON.stringify({ ok: true }), {
						status: 201,
						headers: { "X-Test": "1", "Content-Type": "application/json" },
					}),
			),
		);

		const response = await callWorker(new IncomingRequest("https://gateway.example/api/users"));

		expect(response.status).toBe(201);
		expect(response.headers.get("X-Test")).toBe("1");
		await expect(response.json()).resolves.toEqual({ ok: true });
	});

	it("returns a 502 when the upstream API is unreachable", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn(async () => {
				throw new TypeError("network error");
			}),
		);

		const response = await callWorker(new IncomingRequest("https://gateway.example/api/users"));

		expect(response.status).toBe(502);
	});

	it("returns 404 for paths outside of /api", async () => {
		const fetchSpy = makeFetchSpy(async () => new Response("ok"));
		vi.stubGlobal("fetch", fetchSpy);

		const response = await callWorker(new IncomingRequest("https://gateway.example/some/page"));

		expect(response.status).toBe(404);
		expect(fetchSpy).not.toHaveBeenCalled();
	});
});
