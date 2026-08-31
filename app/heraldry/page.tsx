'use client';

import React, { useEffect, useState } from 'react';
import { AppLayout } from '@/components/AppLayout';
import {
  RewardRow, RewardGrantRow, EarnedRewardColorRow, UnearnedRewardBWRow, PlayerRow
} from '@/types';
import { Award, X } from 'lucide-react';

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
  const [selectedCategory, setSelectedCategory] = useState<string>('Все');
  const [selectedRewardModal, setSelectedRewardModal] = useState<RewardRow | null>(null);
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

  const categories = ['Все', 'Комбинации', 'Игровые', 'Турнирные', 'Другие'];

  const filteredThresholds = rewardsThresholds.filter((r) => {
    if (selectedCategory === 'Все') return true;
    return (r as any)['Категория']?.trim().toLowerCase() === selectedCategory.trim().toLowerCase();
  });

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-card border border-border rounded-2xl p-6 shadow-md">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-brand/10 text-brand rounded-xl">
              <Award className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Геральдика и Награды</h1>
              <p className="text-xs text-muted-foreground">Достижения и кубки игроков покерного клуба "БАЗА"</p>
            </div>
          </div>

          {/* Category Filter Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 bg-muted p-1.5 rounded-xl border border-border">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all min-h-[38px] ${
                  selectedCategory === cat
                    ? 'bg-brand text-white shadow-sm'
                    : 'text-muted-foreground hover:text-foreground hover:bg-card/50'
                }`}
              >
                {cat}
              </button>
            ))}
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
            {filteredThresholds.map((reward, idx) => {
              const title = reward['Название'];
              const userTotal = getUserRewardTotal(myNick, title, grants);

              const t1 = Number(reward['За первое']) || 0;
              const t2 = Number(reward['За второе']) || 0;
              const t3 = Number(reward['За третье']) || 0;
              const t4 = Number(reward['За четвертое']) || 0;

              let level = 0;
              if (t4 > 0 && userTotal >= t4) level = 4;
              else if (t3 > 0 && userTotal >= t3) level = 3;
              else if (t2 > 0 && userTotal >= t2) level = 2;
              else if (t1 > 0 && userTotal >= t1) level = 1;

              const isEarned = level > 0;

              let nextThreshold = 0;
              if (level === 0) nextThreshold = t1 || 1;
              else if (level === 1 && t2 > 0) nextThreshold = t2;
              else if (level === 2 && t3 > 0) nextThreshold = t3;
              else if (level === 3 && t4 > 0) nextThreshold = t4;
              else nextThreshold = userTotal;

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
                  onClick={() => setSelectedRewardModal(reward)}
                  className={`bg-card border rounded-2xl p-4 flex flex-col items-center text-center space-y-3 shadow-md cursor-pointer transition-all hover:scale-[1.02] ${
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

        {/* Reward Details Modal */}
        {selectedRewardModal && (
          <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-md space-y-4 shadow-2xl relative">
              <button
                onClick={() => setSelectedRewardModal(null)}
                className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex flex-col items-center text-center space-y-3">
                <div className="w-28 h-28 rounded-2xl overflow-hidden bg-muted p-2 border border-brand shadow-lg">
                  <img
                    src={
                      colorRewards.find(
                        (c) => c['Название']?.trim().toLowerCase() === selectedRewardModal['Название']?.trim().toLowerCase()
                      )?.['Картинка'] || 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=200'
                    }
                    alt={selectedRewardModal['Название']}
                    className="w-full h-full object-contain"
                  />
                </div>
                <h3 className="text-xl font-bold text-foreground">{selectedRewardModal['Название']}</h3>
                <p className="text-xs text-muted-foreground">{selectedRewardModal['Описание'] || 'Эксклюзивная награда за достижения в турнирах клуба БАЗА'}</p>
              </div>

              <div className="bg-muted p-4 rounded-xl space-y-2 text-xs font-semibold border border-border">
                <div className="flex justify-between text-muted-foreground">
                  <span>Уровень 1 (За первое):</span>
                  <span className="text-foreground">{selectedRewardModal['За первое'] || selectedRewardModal['За сколько начало'] || 1} шт</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Уровень 2 (За второе):</span>
                  <span className="text-foreground">{selectedRewardModal['За второе'] ? `${selectedRewardModal['За второе']} шт` : '-'}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Уровень 3 (За третье):</span>
                  <span className="text-foreground">{selectedRewardModal['За третье'] ? `${selectedRewardModal['За третье']} шт` : '-'}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Уровень 4 (За четвертое):</span>
                  <span className="text-foreground">{selectedRewardModal['За четвертое'] ? `${selectedRewardModal['За четвертое']} шт` : '-'}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
