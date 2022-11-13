import axios, { AxiosInstance } from 'axios';
import { config as loadDotEnv } from 'dotenv';
import { DateTime } from 'luxon';
import { sendBet } from './apiClient';
import { Fixture, UnparsedFixture } from './types';
import functions, { logger } from 'firebase-functions';
import {
  defineInt,
  defineSecret,
  defineString,
} from 'firebase-functions/params';

/**
 * 1. Load the json from the website
 * 2. Check for games starting in the nxt few minutes (variable)
 * 3. For each game, search for the highest score
 * 4. Log for safety.
 *
 * Cookie refresh?
 *
 * RUN EVERY DAY AT 10, 13, 15, 16, 19 UTC
 */
const DELTA_IN_MINUTES = defineInt('DELTA_IN_MINUTES', { default: 20 });
const MAX_GOALS_PER_TEAM = defineInt('MAX_GOALS_PER_MIN', { default: 4 });

function cartesianProduct<T>(...allEntries: Array<T[]>): T[][] {
  return allEntries.reduce<T[][]>(
    (results, entries) =>
      results
        .map((result) => entries.map((entry) => result.concat([entry])))
        .reduce((subResults, result) => subResults.concat(result), []),
    [[]]
  );
}

function range(size: number, startAt = 0) {
  return [...Array(size).keys()].map((i) => i + startAt);
}

export default functions.pubsub
  .schedule('50 9,12,14,15,18 18-20 11-12 *')
  .timeZone('UTC')
  .onRun(async (ctx) => {
    const fixtureTable = await downloadFixtureTable();

    const fixtureToBetOn = fixtureTable.filter(
      (f) => f.DateUtc.diffNow('minutes').minutes <= DELTA_IN_MINUTES.value()
    );

    const searchSpace = cartesianProduct(
      range(MAX_GOALS_PER_TEAM.value() + 1),
      range(MAX_GOALS_PER_TEAM.value() + 1)
    );

    for (const fixture of fixtureToBetOn) {
      logger.log(
        `Looking for the best result of the game ${fixture.HomeTeam} vs ${fixture.AwayTeam}...`
      );
      const bestBet = await getMostBettedResult(
        fixture.MatchNumber,
        searchSpace as [number, number][]
      );
      logger.log(
        `The best bet for the game ${fixture.HomeTeam} vs ${fixture.AwayTeam} is ${bestBet}`
      );

      await sendBet(fixture.MatchNumber, bestBet);
    }
  });

async function getMostBettedResult(
  betId: number,
  searchSpace: [number, number][]
): Promise<[number, number]> {
  const betRequest = async (result: [number, number]) => {
    var percOfPlayers = await sendBet(betId, result);
    return { bet: result, value: percOfPlayers };
  };

  const allRequests = searchSpace.map((x) => betRequest(x));
  const allResponses = await Promise.all(allRequests);
  return allResponses.sort((a, b) => b.value - a.value)[0].bet;
}

async function downloadFixtureTable(): Promise<Fixture[]> {
  const { data: fixtures } = await axios.get<UnparsedFixture[]>(
    'https://fixturedownload.com/feed/json/fifa-world-cup-2022'
  );

  const parseDateString = (s: string) =>
    DateTime.fromFormat(s, "yyyy-LL-dd' 'HH':'mm':'ss'Z'").setZone('UTC', {
      keepLocalTime: true,
    });

  return fixtures.map((f) => ({
    ...f,
    DateUtc: parseDateString(f.DateUtc),
  }));
}
