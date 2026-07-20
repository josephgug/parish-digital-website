// Synchronous capability probe. Needs to be sync (not the async engine boot)
// so the DOM layer knows at first render whether an intro will play — without
// it, a no-WebGL visitor stares at an empty page for the length of a load
// choreography that is never going to happen.

export const HAS_WEBGL = (() => {
  if (typeof document === 'undefined') return false
  try {
    const c = document.createElement('canvas')
    return Boolean(c.getContext('webgl2'))
  } catch {
    return false
  }
})()
