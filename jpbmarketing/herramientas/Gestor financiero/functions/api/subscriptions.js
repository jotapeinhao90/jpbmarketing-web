export async function onRequestGet(context) {
  const { env } = context;
  const list = await env.SUBSCRIPTIONS.list({ prefix: 'sub:' });
  const subs = [];
  for (const key of list.keys) {
    const val = await env.SUBSCRIPTIONS.get(key.name);
    if (val) subs.push(JSON.parse(val));
  }
  return new Response(JSON.stringify(subs), {
    headers: { 'Content-Type': 'application/json' },
  });
}
