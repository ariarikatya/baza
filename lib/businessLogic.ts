import { calculatePlayerRating, isDateInPeriod, groupChatThreads, getRewardLevel } from './calculations';
import { formatRussianDate } from '../types';

export { formatRussianDate, isDateInPeriod, calculatePlayerRating, groupChatThreads, getRewardLevel };

export function calculateRatingForPeriod(
  nick: string,
  period: 'today' | 'month' | 'season' | 'year' | 'all',
  dailyGames: any[] = [],
  bounties: any[] = [],
  tasks: any[] = []
): number {
  return calculatePlayerRating(nick, period, dailyGames, bounties, tasks);
}

export function getRewardStatus(
  userNick: string,
  rewardName: string,
  rewardsConfig: any[] = [],
  userRewards: any[] = []
): { level: number; nextThreshold: number; isMaxLevel: boolean; currentAmount: number } {
  if (!userNick || !rewardName) {
    return { level: 0, nextThreshold: 0, isMaxLevel: false, currentAmount: 0 };
  }

  const targetNick = userNick.trim().toLowerCase();
  const targetReward = rewardName.trim().toLowerCase();

  const currentAmount = userRewards.reduce((acc, row) => {
    const rNick = row['Ник']?.trim().toLowerCase();
    const rName = row['Название']?.trim().toLowerCase();
    if (rNick === targetNick && rName === targetReward) {
      return acc + (Number(row['Количество']) || 1);
    }
    return acc;
  }, 0);

  const config = rewardsConfig.find(
    (row) => row['Название']?.trim().toLowerCase() === targetReward
  );

  if (!config) {
    return { level: 0, nextThreshold: 1, isMaxLevel: false, currentAmount };
  }

  const t1 = Number(config['За первое']) || Number(config['За сколько начало']) || 1;
  const t2 = Number(config['За второе']) || 0;
  const t3 = Number(config['За третье']) || 0;
  const t4 = Number(config['За четвертое']) || 0;

  const thresholds = [t1, t2, t3, t4].filter((t) => t > 0);

  const level = getRewardLevel(currentAmount, {
    l1: thresholds[0] || 1,
    l2: thresholds[1] || Infinity,
    l3: thresholds[2] || Infinity,
    l4: thresholds[3] || Infinity,
  });

  const isMaxLevel = level >= thresholds.length;
  const nextThreshold = isMaxLevel ? (thresholds[thresholds.length - 1] || 1) : (thresholds[level] || 1);

  return { level, nextThreshold, isMaxLevel, currentAmount };
}
