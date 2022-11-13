import axios from 'axios';
import { defineString } from 'firebase-functions/params';

const token = defineString('TOKEN');

const client = axios.create({
  baseURL: 'https://wmtippspiel.srf.ch',
  headers: {
    cookie:
      'betty_web_production=d47f6d29ebe28dd7475ff21ac267305b; wt_rla=292330999892453,3,1668209339182',
  },
});

client.interceptors.request.use((val) => {
  val.data['authenticity_token'] = token.value();
  return val;
});

export async function sendBet(
  betId: number,
  result: [number, number]
): Promise<number> {
  const res = await client.post<{
    message: string;
    perc_players_same_pick: number;
  }>('/bet', {
    bet_id: betId,
    bet: result,
  });

  return res.data.perc_players_same_pick;
}
