export function formatRussianDate(dateString: string): string {
  if (!dateString) return '';
  const parsed = new Date(dateString);
  if (isNaN(parsed.getTime())) {
    return 'Invalid Date';
  }
  return parsed.toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function calculateRatingForPeriod(
  nick: string,
  period: 'today' | 'month' | 'season' | 'year' | 'all',
  dailyGames: any[] = [],
  bounties: any[] = [],
  tasks: any[] = []
): number {
  if (!nick) return 0;
  const targetNick = nick.trim().toLowerCase();
  const now = new Date();

  const isDateInPeriod = (dateStr: string): boolean => {
    if (!dateStr) return false;
    const gameDate = new Date(dateStr);
    if (isNaN(gameDate.getTime())) return false;

    if (period === 'all') return true;
    if (period === 'today') {
      return gameDate.toDateString() === now.toDateString();
    }
    if (period === 'month') {
      return gameDate.getMonth() === now.getMonth() && gameDate.getFullYear() === now.getFullYear();
    }
    if (period === 'season') {
      // Season = last 90 days
      return now.getTime() - gameDate.getTime() <= 90 * 24 * 60 * 60 * 1000;
    }
    if (period === 'year') {
      return gameDate.getFullYear() === now.getFullYear();
    }
    return true;
  };

  // 1. SUM(Начислено) from dailyGames
  const gamesSum = dailyGames.reduce((acc, game) => {
    const gameNick = game['Ник']?.trim().toLowerCase();
    if (gameNick === targetNick && isDateInPeriod(game['Дата'])) {
      return acc + (Number(game['Начислено']) || 0);
    }
    return acc;
  }, 0);

  // 2. SUM(Баллы из баунти) from bounties
  const bountiesSum = bounties.reduce((acc, bounty) => {
    const bountyNick = (bounty['Ник'] || bounty['Игрок'])?.trim().toLowerCase();
    const bountyDate = bounty['Дата'] || bounty['Дата и время'];
    if (bountyNick === targetNick && isDateInPeriod(bountyDate)) {
      return acc + (Number(bounty['Баллы']) || Number(bounty['Баллы из баунти']) || 0);
    }
    return acc;
  }, 0);

  // 3. SUM(Баллы из заданий) from tasks
  const tasksSum = tasks.reduce((acc, task) => {
    const taskNick = (task['Ник'] || task['Игрок'])?.trim().toLowerCase();
    const taskDate = task['Дата'] || task['Дата и время'];
    if (taskNick === targetNick && isDateInPeriod(taskDate)) {
      return acc + (Number(task['Баллы']) || Number(task['Баллы из заданий']) || 0);
    }
    return acc;
  }, 0);

  return gamesSum + bountiesSum + tasksSum;
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

  // Find user's reward records sum
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

  let level = 0;
  let nextThreshold = thresholds[0] || 1;
  let isMaxLevel = false;

  for (let i = 0; i < thresholds.length; i++) {
    if (currentAmount >= thresholds[i]) {
      level = i + 1;
    }
  }

  if (level >= thresholds.length) {
    isMaxLevel = true;
    nextThreshold = thresholds[thresholds.length - 1];
  } else {
    nextThreshold = thresholds[level];
  }

  return { level, nextThreshold, isMaxLevel, currentAmount };
}

export function groupChatThreads(
  messages: any[] = [],
  currentUserEmail: string = ''
): Array<{
  partnerEmail: string;
  partnerName: string;
  partnerAvatar: string;
  lastMessage: string;
  lastTime: string;
}> {
  if (!currentUserEmail) return [];
  const myEmail = currentUserEmail.trim().toLowerCase();

  const groups: {
    [pairKey: string]: {
      partnerEmail: string;
      partnerName: string;
      partnerAvatar: string;
      lastMsgObj: any;
    };
  } = {};

  messages.forEach((msg) => {
    const senderEmail = (msg['Игрок почта'] || '').trim().toLowerCase();
    const recipientEmail = (msg['Кому? От кого?'] || '').trim().toLowerCase();

    if (!senderEmail && !recipientEmail) return;

    let partnerEmail = '';
    let partnerName = '';
    let partnerAvatar = '';

    if (senderEmail === myEmail) {
      partnerEmail = recipientEmail;
      partnerName = recipientEmail.split('@')[0] || recipientEmail;
    } else if (recipientEmail === myEmail || recipientEmail === 'всем') {
      partnerEmail = senderEmail || 'всем';
      partnerName = msg['Игрок'] || senderEmail;
      partnerAvatar = msg['Игрок фото'] || '';
    }

    if (!partnerEmail) return;

    const pairKey = [myEmail, partnerEmail].sort().join('___');

    if (!groups[pairKey]) {
      groups[pairKey] = {
        partnerEmail,
        partnerName: partnerName || partnerEmail,
        partnerAvatar: partnerAvatar || msg['Игрок фото'] || '',
        lastMsgObj: msg,
      };
    } else {
      const existingDate = new Date(groups[pairKey].lastMsgObj['Дата и время отправки'] || 0).getTime();
      const newDate = new Date(msg['Дата и время отправки'] || 0).getTime();
      if (newDate >= existingDate) {
        groups[pairKey].lastMsgObj = msg;
        if (partnerAvatar) groups[pairKey].partnerAvatar = partnerAvatar;
        if (partnerName) groups[pairKey].partnerName = partnerName;
      }
    }
  });

  return Object.values(groups).map((g) => ({
    partnerEmail: g.partnerEmail,
    partnerName: g.partnerName,
    partnerAvatar: g.partnerAvatar,
    lastMessage: g.lastMsgObj['Сообщение'] || '',
    lastTime: formatRussianDate(g.lastMsgObj['Дата и время отправки']),
  }));
}
