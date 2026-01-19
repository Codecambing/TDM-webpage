import type { APIRoute } from "astro";

export const POST: APIRoute = async ({ request }) => {
  const { password } = await request.json();
  const realPassword = import.meta.env.PASSWORD_GROUPSTAGE_EDITOR;

  return new Response(
    JSON.stringify({ ok: password === realPassword }),
    { status: 200 }
  );
};
