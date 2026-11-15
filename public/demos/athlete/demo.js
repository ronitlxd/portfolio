// Athlete Injury Dashboard replica. These pages were rendered by the real
// Django app from its own demo seed data, then saved as static files. Links
// to pages that weren't saved, and every form (follow-ups, recover, exports,
// logout...), show a short notice here instead of going anywhere.
(function () {
  function notice(text) {
    let box = document.getElementById('replica-notice')
    if (!box) {
      box = document.createElement('div')
      box.id = 'replica-notice'
      box.style.cssText =
        'position:fixed;left:50%;bottom:24px;transform:translateX(-50%);z-index:99999;padding:10px 16px;border-radius:8px;background:#212529;color:#fff;font:14px system-ui,sans-serif;box-shadow:0 4px 16px rgba(0,0,0,.25)'
      document.body.append(box)
    }
    box.textContent = text
    box.style.display = 'block'
    clearTimeout(box._t)
    box._t = setTimeout(() => (box.style.display = 'none'), 2600)
  }

  document.addEventListener(
    'click',
    (e) => {
      const a = e.target.closest('a[data-replica-off]')
      if (!a) return
      e.preventDefault()
      notice("That page isn't part of this replica. It uses sample data only.")
    },
    true,
  )

  document.addEventListener(
    'submit',
    (e) => {
      e.preventDefault()
      notice('Replica: nothing is saved, this is sample data.')
    },
    true,
  )

  // Some actions call the app's JSON endpoints with fetch. Background reads
  // (e.g. notification counts) get an empty answer quietly; anything that
  // would save something shows the notice.
  const realFetch = window.fetch.bind(window)
  window.fetch = (input, init = {}) => {
    const url = String(typeof input === 'string' ? input : input.url)
    const local = url.startsWith('/') || url.startsWith(location.origin + '/')
    if (local && !url.includes('/demos/')) {
      if ((init.method || 'GET').toUpperCase() !== 'GET') notice('Replica: nothing is saved, this is sample data.')
      return Promise.resolve(new Response('{}', { headers: { 'Content-Type': 'application/json' } }))
    }
    return realFetch(input, init)
  }
})()
