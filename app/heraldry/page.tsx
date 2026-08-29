'use client';

import React, { useEffect, useState } from 'react';
import { AppLayout } from '@/components/AppLayout';
import {
  RewardRow, RewardGrantRow, EarnedRewardColorRow, UnearnedRewardBWRow, PlayerRow
} from '@/types';
import { Award } from 'lucide-react';

function getUserRewardTotal(
  nick: string,
  rewardName: string,
  grants: RewardGrantRow[] = []
): number {
  if (!nick || !rewardName) return 0;
  const targetNick = nick.trim().toLowerCase();
  const targetReward = rewardName.trim().toLowerCase();

  return grants.reduce((acc, row) => {
    const rNick = row['Ник']?.trim().toLowerCase();
    const rName = row['Название']?.trim().toLowerCase();
    if (rNick === targetNick && rName === targetReward) {
      return acc + (Number(row['Количество']) || 1);
    }
    return acc;
  }, 0);
}

export default function HeraldryPage() {
  const [currentUser, setCurrentUser] = useState<PlayerRow | null>(null);
  const [rewardsThresholds, setRewardsThresholds] = useState<RewardRow[]>([]);
  const [colorRewards, setColorRewards] = useState<EarnedRewardColorRow[]>([]);
  const [bwRewards, setBwRewards] = useState<UnearnedRewardBWRow[]>([]);
  const [grants, setGrants] = useState<RewardGrantRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem('baza_user');
    if (stored) {
      try {
        setCurrentUser(JSON.parse(stored));
      } catch (e) {
        console.error(e);
      }
    }

    async function fetchHeraldryData() {
      try {
        const [threshRes, colorRes, bwRes, grantsRes] = await Promise.all([
          fetch('/api/sheets?sheet=НАГРАДЫ'),
          fetch('/api/sheets?sheet=Награды по отдельности'),
          fetch('/api/sheets?sheet=Награды чб по отдельности'),
          fetch('/api/sheets?sheet=НАЧИСЛЕНИЕ НАГРАД'),
        ]);

        const threshData = await threshRes.json();
        const colorData = await colorRes.json();
        const bwData = await bwRes.json();
        const grantsData = await grantsRes.json();

        if (threshData.data && Array.isArray(threshData.data)) setRewardsThresholds(threshData.data);
        if (colorData.data && Array.isArray(colorData.data)) setColorRewards(colorData.data);
        if (bwData.data && Array.isArray(bwData.data)) setBwRewards(bwData.data);
        if (grantsData.data && Array.isArray(grantsData.data)) setGrants(grantsData.data);
      } catch (err) {
        console.error('Failed to load heraldry data:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchHeraldryData();
  }, []);

  const myNick = currentUser?.['Ник'] || '';

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-3 bg-card border border-border rounded-2xl p-6 shadow-md">
          <div className="p-3 bg-brand/10 text-brand rounded-xl">
            <Award className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Геральдика и Награды</h1>
            <p className="text-xs text-muted-foreground">Достижения и кубки игроков покерного клуба "БАЗА"</p>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-48 bg-card border border-border rounded-2xl animate-pulse"></div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {rewardsThresholds.map((reward, idx) => {
              const title = reward['Название'];
              const userTotal = getUserRewardTotal(myNick, title, grants);

              const t1 = Number(reward['За первое']) || Number(reward['За сколько начало']) || 1;
              const t2 = Number(reward['За второе']) || 0;
              const t3 = Number(reward['За третье']) || 0;
              const t4 = Number(reward['За четвертое']) || 0;
              const thresholds = [t1, t2, t3, t4].filter((t) => t > 0);
              const firstThreshold = thresholds[0] || 1;

              // Logic: If userTotal >= threshold, show COLOR image, else B&W image
              const isEarned = userTotal >= firstThreshold;

              let nextThreshold = firstThreshold;
              for (const t of thresholds) {
                if (userTotal < t) {
                  nextThreshold = t;
                  break;
                }
                nextThreshold = t;
              }

              const colorMatch = colorRewards.find(
                (c) => c['Название']?.trim().toLowerCase() === title?.trim().toLowerCase()
              );
              const bwMatch = bwRewards.find(
                (b) => b['Название']?.trim().toLowerCase() === title?.trim().toLowerCase()
              );

              const displayImage = isEarned
                ? colorMatch?.['Картинка'] || 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=200'
                : bwMatch?.['Картинка'] || 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=200';

              const progressPercent = Math.min(100, Math.round((userTotal / (nextThreshold || 1)) * 100));

              return (
                <div
                  key={idx}
                  className={`bg-card border rounded-2xl p-4 flex flex-col items-center text-center space-y-3 shadow-md transition-all ${
                    isEarned ? 'border-amber-500/50 shadow-amber-500/10' : 'border-border/60 opacity-80'
                  }`}
                >
                  <div className="relative w-24 h-24 rounded-2xl overflow-hidden bg-muted flex items-center justify-center p-2 border border-border">
                    <img
                      src={displayImage}
                      alt={title}
                      className={`w-full h-full object-contain ${!isEarned ? 'grayscale contrast-125' : ''}`}
                    />
                  </div>

                  <div className="space-y-1">
                    <h3 className="font-bold text-foreground text-sm leading-tight">{title}</h3>
                    {reward['Описание'] && (
                      <p className="text-[11px] text-muted-foreground line-clamp-2">{reward['Описание']}</p>
                    )}
                  </div>

                  {/* Progress Bar & Counter */}
                  <div className="w-full pt-2 border-t border-border space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className="text-muted-foreground">Прогресс:</span>
                      <span className={isEarned ? 'text-amber-400 font-bold' : 'text-foreground'}>
                        {userTotal}/{nextThreshold}
                      </span>
                    </div>
                    <div className="w-full h-2 bg-muted rounded-full overflow-hidden border border-border/40">
                      <div
                        className={`h-full transition-all duration-500 ${isEarned ? 'bg-amber-400' : 'bg-brand'}`}
                        style={{ width: `${progressPercent}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
