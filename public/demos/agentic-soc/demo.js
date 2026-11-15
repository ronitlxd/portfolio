// Agentic SOC replica. These pages were rendered by the real soc_web.py from
// sample tickets (scratch render script, see public/demos/README.md). The
// response buttons POST to /respond; this answers that request here so the
// page shows its normal confirmation, and nothing is written or dispatched.
(function () {
  const realFetch = window.fetch.bind(window)
  window.fetch = (input, init) => {
    const path = String(typeof input === 'string' ? input : input.url).replace(location.origin, '')
    if (path === '/respond') {
      const body = JSON.parse((init && init.body) || '{}')
      return Promise.resolve(
        new Response(JSON.stringify({ status: 'ok', ticket_id: body.ticket_id, option: body.option }), {
          headers: { 'Content-Type': 'application/json' },
        }),
      )
    }
    return realFetch(input, init)
  }
})()
