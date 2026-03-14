let listeners = []

function emit(toast) {
  for (const l of listeners) l(toast)
}

export const toastBus = {
  subscribe(listener) {
    listeners.push(listener)
    return () => {
      listeners = listeners.filter((x) => x !== listener)
    }
  },
}

export const toast = {
  success(message) {
    emit({ type: 'success', message })
  },
  error(message) {
    emit({ type: 'error', message })
  },
  info(message) {
    emit({ type: 'info', message })
  },
}
