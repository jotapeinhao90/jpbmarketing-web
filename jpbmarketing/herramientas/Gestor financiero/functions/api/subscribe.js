export async function onRequestPost(context) {
  const { request, env } = context;
  let sub;
  try {
    sub = await request.json();
  } catch {
    return new Response('Bad request', { status: 400 });
  }
  if (!sub || !sub.endpoint) return new Response('Bad request', { status: 400 });

  await env.SUBSCRIPTIONS.put(`sub:${sub.endpoint}`, JSON.stringify(sub));
  return new Response('ok');
}
