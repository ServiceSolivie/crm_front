import client from './client'

const unwrap = (r) => r.data?.data ?? r.data

export const teamLeaderApi = {
  agents: () => client.get('/team/agents').then(unwrap),
  followUps: () => client.get('/team/follow-ups').then(unwrap),
}
