// Real Singapore time, independent of background previews or device timezone.
export function isBuddySleepTime(date = new Date()) {
  const hour = Number(new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Singapore', hour: '2-digit', hourCycle: 'h23',
  }).format(date))
  return hour >= 0 && hour < 7
}

const learningRoutes = new Set([
  'selection-subjects', 'selection-topics', 'study-mode', 'learn',
  'study-decks', 'quiz', 'quiz-battle', 'surprise-boss', 'timer',
])
export const isLearningRoute = route => learningRoutes.has(route?.name)

export function sleepRouteGuard(to) {
  if (isBuddySleepTime() && isLearningRoute(to)) return { name: 'home', replace: true }
  return true
}
