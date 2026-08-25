'use client';

import React, { useEffect, useState } from 'react';
import { AppLayout } from '@/components/AppLayout';
import {
  RewardRow, RewardGrantRow, EarnedRewardColorRow, UnearnedRewardBWRow, PlayerRow
} from '@/types';
import { Award } from 'lucide-react';

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

  const myNick = currentUser?.['Ник']?.trim().toLowerCase();

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
              const threshold = Number(reward['За сколько начало']) || 1;

              // Total quantity for current user for this reward
              const userGrants = grants.filter(
                (g) =>
                  g['Ник']?.trim().toLowerCase() === myNick &&
                  g['Название']?.trim().toLowerCase() === title?.trim().toLowerCase()
              );

              const userCount = userGrants.reduce(
                (acc, curr) => acc + (Number(curr['Количество']) || 1),
                0
              );

              const isEarned = userCount >= threshold;

              const colorMatch = colorRewards.find(
                (c) => c['Название']?.trim().toLowerCase() === title?.trim().toLowerCase()
              );
              const bwMatch = bwRewards.find(
                (b) => b['Название']?.trim().toLowerCase() === title?.trim().toLowerCase()
              );

              const displayImage = isEarned
                ? colorMatch?.['Картинка'] || 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=200'
                : bwMatch?.['Картинка'] || 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=200';

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

                  <div className="w-full pt-2 border-t border-border flex items-center justify-between text-xs font-semibold">
                    <span className="text-muted-foreground">Прогресс:</span>
                    <span className={isEarned ? 'text-amber-400 font-bold' : 'text-foreground'}>
                      {userCount} / {threshold}
                    </span>
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
