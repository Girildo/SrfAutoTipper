import { DateTime } from 'luxon';

export type UnparsedFixture = {
  MatchNumber: number;
  RoundNumber: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  DateUtc: string;
  Location: string;
  HomeTeam: string;
  AwayTeam: string;
  Group: string;
  HomeTeamScore: number;
  AwayTeamScore: number;
};

export type Fixture = Omit<UnparsedFixture, 'DateUtc'> & { DateUtc: DateTime };
