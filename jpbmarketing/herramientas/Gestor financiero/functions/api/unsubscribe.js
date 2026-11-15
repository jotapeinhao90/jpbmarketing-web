export async function onRequestPost(context) {
  const { request, env } = context;
  let body;
  try {
    body = await request.json();
  } catch {
    return new Response('Bad request', { status: 400 });
  }
  if (body && body.endpoint) {
    await env.SUBSCRIPTIONS.delete(`sub:${body.endpoint}`);
  }
  return new Response('ok');
}
