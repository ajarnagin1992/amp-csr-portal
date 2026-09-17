/**
 * API gateway Worker.
 *
 * Static assets (the built React app) are served directly by Cloudflare from
 * the `assets` binding configured in wrangler.jsonc; `run_worker_first` there
 * routes only `/api/*` requests to this fetch handler. Everything this Worker
 * sees is therefore expected to be an API request, which it proxies to the
 * NestJS API, stripping the `/api` prefix.
 */

export interface Env {
	API_ORIGIN: string;
}

export default {
	async fetch(request, env, _ctx): Promise<Response> {
		const url = new URL(request.url);
		if (url.pathname !== "/api" && !url.pathname.startsWith("/api/")) {
			return new Response("Not Found", { status: 404 });
		}

		const targetPath = url.pathname.slice("/api".length) || "/";
		const targetUrl = new URL(targetPath + url.search, env.API_ORIGIN);
		const proxyRequest = new Request(targetUrl, request);

		try {
			return await fetch(proxyRequest);
		} catch {
			return new Response("Bad Gateway", { status: 502 });
		}
	},
} satisfies ExportedHandler<Env>;
