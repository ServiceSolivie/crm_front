import notificationSoundUrl from '@/assets/sounds/notification.wav'

let audio = null
let unlocked = false

function ensureAudio() {
  if (!audio) {
    audio = new Audio(notificationSoundUrl)
    audio.volume = 0.5
  }
  return audio
}

function unlock() {
  if (unlocked) return
  const a = ensureAudio()
  a.play()
    .then(() => {
      a.pause()
      a.currentTime = 0
      unlocked = true
    })
    .catch(() => {})
}

function play() {
  const a = ensureAudio()
  a.currentTime = 0
  a.play().catch(() => {})
}

export function useNotificationSound() {
  return { play, unlock }
}
